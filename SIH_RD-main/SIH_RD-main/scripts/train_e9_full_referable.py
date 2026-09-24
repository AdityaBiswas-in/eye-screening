"""E9: full-domain, domain×grade-balanced referable-aware training.

E9 extends the validated E8 architecture by using the complete available
APTOS training split and complete IDRiD training split, while balancing
training exposure across domain × DR-grade cells.

The official APTOS and IDRiD test sets remain untouched.

This is an experimental domain-generalization protocol, not a claim of
clinical validation or optimal domain generalization.
"""

from __future__ import annotations

import random
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import (
    ConcatDataset,
    DataLoader,
    Dataset,
    WeightedRandomSampler,
    Subset,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.train_e0_resnet50 import (
    _load_config,
    _seed_everything,
    select_device,
)
from training.datasets.aptos import (
    AptosDataset,
    load_aptos_records,
)
from training.datasets.idrid import IDRiDDataset
from training.evaluation.metrics import compute_dr_metrics
from training.losses.e8_referable import compute_e8_loss
from training.losses.e3_multitask import LESION_TYPES
from training.models import build_e8_referable_resnet50
from training.preprocessing import (
    build_eval_transform,
    build_train_transform,
)
from training.utils.aptos_manifest import (
    inverse_frequency_class_weights,
    load_aptos_manifest_records,
)
from training.utils.checkpoints import save_checkpoint
from training.utils.config import AptosConfig


SEED = 42

EPOCHS = 7
BATCH_SIZE = 2
LEARNING_RATE = 3e-5
WEIGHT_DECAY = 1e-4
IMAGE_SIZE = 384

LESION_LOSS_WEIGHT = 1.0
REFERABLE_LOSS_WEIGHT = 1.0


class AptosE9Dataset(Dataset):
    """APTOS adapter exposing the E8/E9 multitask interface."""

    def __init__(self, base_dataset):
        self.base_dataset = base_dataset

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, index):
        image, grade = self.base_dataset[index]

        h, w = image.shape[-2:]

        empty = torch.zeros(
            1,
            h,
            w,
            dtype=torch.float32,
        )

        return {
            "image": image,
            "grade": grade,
            "lesion_masks": {
                lesion: empty.clone()
                for lesion in LESION_TYPES
            },
            "lesion_available": {
                lesion: torch.tensor(False)
                for lesion in LESION_TYPES
            },
            "image_id": f"APTOS_{index:05d}",
        }


class IDRiDE9Dataset(Dataset):
    """IDRiD adapter exposing the existing multitask interface."""

    def __init__(self, base_dataset):
        self.base_dataset = base_dataset

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, index):
        return self.base_dataset[index]


def collate_batch(batch):
    images = torch.stack(
        [item["image"] for item in batch]
    )

    grades = torch.tensor(
        [int(item["grade"]) for item in batch],
        dtype=torch.long,
    )

    lesion_masks = {
        lesion: torch.stack(
            [
                item["lesion_masks"][lesion]
                for item in batch
            ]
        )
        for lesion in LESION_TYPES
    }

    lesion_available = {
        lesion: torch.tensor(
            [
                bool(item["lesion_available"][lesion])
                for item in batch
            ],
            dtype=torch.bool,
        )
        for lesion in LESION_TYPES
    }

    image_ids = [
        item["image_id"]
        for item in batch
    ]

    return {
        "image": images,
        "grade": grades,
        "lesion_masks": lesion_masks,
        "lesion_available": lesion_available,
        "image_id": image_ids,
    }


def screening_metrics(
    referable_probabilities,
    labels,
    threshold,
):
    predicted = (
        referable_probabilities >= threshold
    )

    actual = labels >= 2

    tp = np.sum(actual & predicted)
    fn = np.sum(actual & ~predicted)
    tn = np.sum(~actual & ~predicted)
    fp = np.sum(~actual & predicted)

    sensitivity = (
        tp / (tp + fn)
        if tp + fn
        else np.nan
    )

    specificity = (
        tn / (tn + fp)
        if tn + fp
        else np.nan
    )

    return {
        "threshold": float(threshold),
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "tp": int(tp),
        "fn": int(fn),
        "tn": int(tn),
        "fp": int(fp),
    }


def choose_validation_threshold(
    referable_probabilities,
    labels,
):
    thresholds = np.linspace(
        0.05,
        0.95,
        901,
    )

    candidates = []

    for threshold in thresholds:
        result = screening_metrics(
            referable_probabilities,
            labels,
            threshold,
        )

        if result["specificity"] >= 0.85:
            candidates.append(result)

    if not candidates:
        return None

    return max(
        candidates,
        key=lambda x: (
            x["sensitivity"],
            x["specificity"],
            -x["threshold"],
        ),
    )


def evaluate(
    model,
    loader,
    device,
    dr_criterion,
):
    model.eval()

    probabilities = []
    referable_probabilities = []
    labels = []
    losses = []

    with torch.no_grad():
        for batch in loader:
            images = batch["image"].to(device)
            grades = batch["grade"].to(device)

            outputs = model.forward_e8(images)

            dr_logits = outputs["dr_logits"]

            losses.append(
                dr_criterion(
                    dr_logits,
                    grades,
                ).item()
            )

            probabilities.append(
                torch.softmax(
                    dr_logits,
                    dim=1,
                ).cpu().numpy()
            )

            referable_probabilities.append(
                torch.sigmoid(
                    outputs["referable_logits"]
                ).cpu().numpy()
            )

            labels.extend(
                grades.cpu().tolist()
            )

    return (
        np.concatenate(probabilities),
        np.concatenate(
            referable_probabilities
        ),
        np.asarray(labels),
        float(np.mean(losses)),
    )


def make_domain_grade_balanced_sampler(
    domain_labels,
    grade_labels,
):
    """Balance exposure across observed domain × grade cells.

    Each observed cell receives equal total sampling weight.
    Images inside a cell receive equal weight.

    This does not alter validation or test sets.
    """

    cells = {}

    for index, (domain, grade) in enumerate(
        zip(domain_labels, grade_labels)
    ):
        key = (
            str(domain),
            int(grade),
        )

        cells.setdefault(
            key,
            [],
        ).append(index)

    if not cells:
        raise RuntimeError(
            "No domain × grade cells available."
        )

    cell_count = len(cells)

    weights = torch.zeros(
        len(domain_labels),
        dtype=torch.double,
    )

    for indices in cells.values():
        cell_size = len(indices)

        # Equal total probability mass per observed cell.
        cell_weight = 1.0 / (
            cell_count * cell_size
        )

        for index in indices:
            weights[index] = cell_weight

    return WeightedRandomSampler(
        weights=weights,
        num_samples=len(domain_labels),
        replacement=True,
        generator=torch.Generator().manual_seed(SEED),
    ), cells


def main():
    _seed_everything(SEED)

    device = select_device()

    print(f"device: {device}")
    print(f"epochs: {EPOCHS}")
    print("domain sampling: full training data")
    print("sampling strategy: domain x grade balanced")
    print(f"batch_size: {BATCH_SIZE}")
    print(f"learning_rate: {LEARNING_RATE}")

    # ============================================================
    # APTOS
    # ============================================================

    aptos_root = (
        PROJECT_ROOT
        / "data"
        / "aptos"
        / "aptos2019"
    )

    records, failures = load_aptos_records(
        AptosConfig(
            aptos_root,
            aptos_root / "train.csv",
            aptos_root / "train_images",
            "id_code",
            "diagnosis",
            0.15,
            SEED,
        ),
        validate_images=False,
    )

    if failures:
        raise RuntimeError(
            f"Missing APTOS images: {failures[:5]}"
        )

    manifest = load_aptos_manifest_records(
        PROJECT_ROOT
        / "data"
        / "aptos"
        / "aptos2019_split_manifest.csv",
        records,
    )

    aptos_train_base = AptosDataset(
        manifest["train"],
        build_train_transform(
            image_size=IMAGE_SIZE
        ),
    )

    aptos_train = AptosE9Dataset(
        aptos_train_base
    )

    aptos_val = AptosE9Dataset(
        AptosDataset(
            manifest["validation"],
            build_eval_transform(
                image_size=IMAGE_SIZE
            ),
        )
    )

    aptos_train_grades = [
        int(record.label)
        for record in manifest["train"]
    ]

    # ============================================================
    # IDRiD
    # ============================================================

    idrid_root = (
        PROJECT_ROOT / "data" / "idrid"
    )

    idrid_images = sorted(
        (
            idrid_root
            / "B. Disease Grading"
            / "1. Original Images"
            / "a. Training Set"
        ).glob("*.jpg")
    )

    idrid_csv = (
        idrid_root
        / "B. Disease Grading"
        / "2. Groundtruths"
        / "a. IDRiD_Disease Grading_Training Labels.csv"
    )

    segmentation_root = (
        idrid_root
        / "A. Segmentation"
        / "2. All Segmentation Groundtruths"
        / "a. Training Set"
    )

    idrid_df = pd.read_csv(idrid_csv)

    idrid_label_map = {
        str(row["Image name"]): int(
            row["Retinopathy grade"]
        )
        for _, row in idrid_df.iterrows()
    }

    idrid_labels = [
        idrid_label_map[path.stem]
        for path in idrid_images
    ]

    # Reproduce the existing deterministic 80/20 IDRiD
    # training/validation split.
    rng = random.Random(SEED)

    by_class = {}

    for index, label in enumerate(
        idrid_labels
    ):
        by_class.setdefault(
            int(label),
            [],
        ).append(index)

    idrid_train_indices = []
    idrid_val_indices = []

    for label in sorted(by_class):
        indices = by_class[label][:]
        rng.shuffle(indices)

        cut = max(
            1,
            int(round(len(indices) * 0.80)),
        )

        idrid_train_indices.extend(
            indices[:cut]
        )

        idrid_val_indices.extend(
            indices[cut:]
        )

    idrid_train_paths = [
        idrid_images[i]
        for i in sorted(
            idrid_train_indices
        )
    ]

    idrid_val_paths = [
        idrid_images[i]
        for i in sorted(
            idrid_val_indices
        )
    ]

    idrid_train_base = IDRiDDataset(
        image_paths=idrid_train_paths,
        grading_csv=idrid_csv,
        segmentation_root=segmentation_root,
        transform=build_train_transform(
            image_size=IMAGE_SIZE
        ),
    )

    idrid_val_base = IDRiDDataset(
        image_paths=idrid_val_paths,
        grading_csv=idrid_csv,
        segmentation_root=segmentation_root,
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    idrid_train = IDRiDE9Dataset(
        idrid_train_base
    )

    idrid_val = IDRiDE9Dataset(
        idrid_val_base
    )

    idrid_train_grades = [
        idrid_label_map[path.stem]
        for path in idrid_train_paths
    ]

    # ============================================================
    # FULL MIXED TRAINING SET
    # ============================================================

    mixed_train = ConcatDataset(
        [
            aptos_train,
            idrid_train,
        ]
    )

    domain_labels = (
        ["APTOS"] * len(aptos_train)
        + ["IDRiD"] * len(idrid_train)
    )

    grade_labels = (
        aptos_train_grades
        + idrid_train_grades
    )

    sampler, cells = (
        make_domain_grade_balanced_sampler(
            domain_labels,
            grade_labels,
        )
    )

    print(
        f"APTOS training samples: "
        f"{len(aptos_train)}"
    )

    print(
        f"IDRiD training samples: "
        f"{len(idrid_train)}"
    )

    print(
        f"Mixed training samples: "
        f"{len(mixed_train)}"
    )

    print(
        "Observed domain x grade cells:"
    )

    for cell, indices in sorted(
        cells.items()
    ):
        print(
            f"  {cell}: {len(indices)}"
        )

    train_loader = DataLoader(
        mixed_train,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_batch,
    )

    aptos_val_loader = DataLoader(
        aptos_val,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_batch,
    )

    idrid_val_loader = DataLoader(
        idrid_val,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_batch,
    )

    # ============================================================
    # MODEL
    # ============================================================

    source_checkpoint = (
        PROJECT_ROOT
        / "checkpoints"
        / "e8_referable_best.pt"
    )

    if not source_checkpoint.exists():
        raise FileNotFoundError(
            f"Missing E8 checkpoint: "
            f"{source_checkpoint}"
        )

    model = build_e8_referable_resnet50(
        pretrained=False,
    ).to(device)

    checkpoint = torch.load(
        source_checkpoint,
        map_location=device,
        weights_only=False,
    )

    source_state = checkpoint["model_state"]

    missing, unexpected = (
        model.load_state_dict(
            source_state,
            strict=True,
        )
    )

    if missing:
        raise RuntimeError(
            f"Unexpected missing checkpoint keys: "
            f"{missing}"
        )

    if unexpected:
        raise RuntimeError(
            f"Unexpected checkpoint keys: "
            f"{unexpected}"
        )

    print(
        f"initialized_from: "
        f"{source_checkpoint}"
    )

    print(
        f"E8 source epoch: "
        f"{checkpoint.get('epoch', 'unknown')}"
    )

    # ============================================================
    # LOSSES
    # ============================================================

    class_weights = (
        inverse_frequency_class_weights(
            manifest["train"]
        )
    )

    dr_criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(
            class_weights,
            dtype=torch.float32,
            device=device,
        )
    )

    referable_criterion = (
        nn.BCEWithLogitsLoss()
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    # ============================================================
    # TRAIN
    # ============================================================

    best_score = float("-inf")

    for epoch in range(
        1,
        EPOCHS + 1,
    ):
        started = time.perf_counter()

        model.train()

        total_losses = []

        for batch in train_loader:
            images = batch["image"].to(
                device
            )

            grades = batch["grade"].to(
                device
            )

            lesion_masks = {
                key: value.to(device)
                for key, value in (
                    batch["lesion_masks"]
                    .items()
                )
            }

            lesion_available = {
                key: value.to(device)
                for key, value in (
                    batch[
                        "lesion_available"
                    ].items()
                )
            }

            optimizer.zero_grad(
                set_to_none=True
            )

            outputs = model.forward_e8(
                images
            )

            total_loss, loss_values = (
                compute_e8_loss(
                    dr_logits=outputs[
                        "dr_logits"
                    ],
                    referable_logits=outputs[
                        "referable_logits"
                    ],
                    grades=grades,
                    lesion_logits={
                        lesion: outputs[
                            f"{lesion}_logits"
                        ]
                        for lesion in LESION_TYPES
                    },
                    lesion_masks=lesion_masks,
                    lesion_available=(
                        lesion_available
                    ),
                    dr_criterion=dr_criterion,
                    referable_criterion=(
                        referable_criterion
                    ),
                    lesion_weight=(
                        LESION_LOSS_WEIGHT
                    ),
                    referable_weight=(
                        REFERABLE_LOSS_WEIGHT
                    ),
                )
            )

            total_loss.backward()

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                max_norm=5.0,
            )

            optimizer.step()

            total_losses.append(
                float(total_loss.item())
            )

        # ========================================================
        # VALIDATION
        # ========================================================

        (
            aptos_probs,
            aptos_ref_probs,
            aptos_labels,
            aptos_loss,
        ) = evaluate(
            model,
            aptos_val_loader,
            device,
            dr_criterion,
        )

        (
            idrid_probs,
            idrid_ref_probs,
            idrid_labels_array,
            idrid_loss,
        ) = evaluate(
            model,
            idrid_val_loader,
            device,
            dr_criterion,
        )

        aptos_metrics = compute_dr_metrics(
            aptos_labels,
            aptos_probs,
        )

        idrid_metrics = compute_dr_metrics(
            idrid_labels_array,
            idrid_probs,
        )

        pooled_ref_probs = np.concatenate(
            [
                aptos_ref_probs,
                idrid_ref_probs,
            ]
        )

        pooled_labels = np.concatenate(
            [
                aptos_labels,
                idrid_labels_array,
            ]
        )

        threshold_result = (
            choose_validation_threshold(
                pooled_ref_probs,
                pooled_labels,
            )
        )

        if threshold_result is None:
            raise RuntimeError(
                "No validation threshold "
                "satisfied specificity >= 0.85."
            )

        pooled_screening = (
            threshold_result
        )

        mean_qwk = (
            aptos_metrics[
                "quadratic_weighted_kappa"
            ]
            + idrid_metrics[
                "quadratic_weighted_kappa"
            ]
        ) / 2.0

        screening_mean = (
            pooled_screening[
                "sensitivity"
            ]
            + pooled_screening[
                "specificity"
            ]
        ) / 2.0

        combined_score = (
            0.5 * mean_qwk
            + 0.5 * screening_mean
        )

        metrics = {
            "aptos_validation": {
                **aptos_metrics,
                "loss": aptos_loss,
            },
            "idrid_validation": {
                **idrid_metrics,
                "loss": idrid_loss,
            },
            "pooled_validation_screening": (
                pooled_screening
            ),
            "mean_qwk": float(mean_qwk),
            "screening_mean": float(
                screening_mean
            ),
            "combined_score": float(
                combined_score
            ),
        }

        checkpoint_out = (
            PROJECT_ROOT
            / "checkpoints"
            / f"e9_full_referable_epoch_"
            f"{epoch:03d}.pt"
        )

        save_checkpoint(
            checkpoint_out,
            model,
            optimizer,
            epoch,
            metrics,
            {
                "experiment": (
                    "e9_full_referable"
                ),
                "image_size": IMAGE_SIZE,
                "batch_size": BATCH_SIZE,
                "learning_rate": (
                    LEARNING_RATE
                ),
                "weight_decay": WEIGHT_DECAY,
                "sampling": (
                    "domain_x_grade_balanced"
                ),
                "aptos_training_samples": (
                    len(aptos_train)
                ),
                "idrid_training_samples": (
                    len(idrid_train)
                ),
                "lesion_loss_weight": (
                    LESION_LOSS_WEIGHT
                ),
                "referable_loss_weight": (
                    REFERABLE_LOSS_WEIGHT
                ),
                "seed": SEED,
                "source_checkpoint": str(
                    source_checkpoint
                ),
                "test_sets_used_for_selection": (
                    False
                ),
            },
            SEED,
        )

        if combined_score > best_score:
            best_score = combined_score

            best_path = (
                PROJECT_ROOT
                / "checkpoints"
                / "e9_full_referable_best.pt"
            )

            torch.save(
                torch.load(
                    checkpoint_out,
                    map_location="cpu",
                    weights_only=False,
                ),
                best_path,
            )

        print(
            f"\nE9 epoch={epoch}"
            f"\ntrain_loss="
            f"{np.mean(total_losses):.6f}"
            f"\nAPTOS validation="
            f"{metrics['aptos_validation']}"
            f"\nIDRiD validation="
            f"{metrics['idrid_validation']}"
            f"\npooled screening="
            f"{pooled_screening}"
            f"\nmean_qwk="
            f"{mean_qwk:.6f}"
            f"\nscreening_mean="
            f"{screening_mean:.6f}"
            f"\ncombined_score="
            f"{combined_score:.6f}"
            f"\nwall_clock_seconds="
            f"{time.perf_counter() - started:.2f}"
            f"\ncheckpoint="
            f"{checkpoint_out}\n"
        )


if __name__ == "__main__":
    main()
