"""E4: balanced mixed-domain fine-tuning for DR grading.

E4 extends the validated E3 architecture by jointly fine-tuning on
APTOS and IDRiD training data. The official test sets remain untouched.

This is an experimental domain-robustness protocol, not a claim of
optimal domain generalization.
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
from torch.utils.data import ConcatDataset, DataLoader, Subset

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.train_e0_resnet50 import _load_config, _seed_everything, select_device
from training.datasets.aptos import AptosDataset, load_aptos_records
from training.datasets.idrid import IDRiDDataset
from training.evaluation.metrics import compute_dr_metrics
from training.losses.e3_multitask import compute_e3_loss, LESION_TYPES
from training.models import build_research_resnet50
from training.preprocessing import build_eval_transform, build_train_transform
from training.utils.aptos_manifest import (
    inverse_frequency_class_weights,
    load_aptos_manifest_records,
)
from training.utils.checkpoints import save_checkpoint
from training.utils.config import AptosConfig


SEED = 42
DOMAIN_SAMPLES = 330
EPOCHS = 5
BATCH_SIZE = 2
LEARNING_RATE = 5e-5
WEIGHT_DECAY = 1e-4
IMAGE_SIZE = 384
LESION_LOSS_WEIGHT = 1.0


def stratified_indices(labels: list[int], n: int, seed: int) -> list[int]:
    """Select n samples while approximately preserving class proportions."""
    rng = random.Random(seed)

    by_class: dict[int, list[int]] = {}
    for index, label in enumerate(labels):
        by_class.setdefault(int(label), []).append(index)

    selected: list[int] = []

    for label in sorted(by_class):
        indices = by_class[label][:]
        rng.shuffle(indices)

        quota = round(len(indices) / len(labels) * n)
        selected.extend(indices[:quota])

    if len(selected) < n:
        remaining = [i for i in range(len(labels)) if i not in set(selected)]
        rng.shuffle(remaining)
        selected.extend(remaining[: n - len(selected)])

    if len(selected) > n:
        rng.shuffle(selected)
        selected = selected[:n]

    return sorted(selected)


class AptosE4Dataset(torch.utils.data.Dataset):
    """APTOS grading dataset adapted to the E3 multitask interface."""

    def __init__(self, base_dataset):
        self.base_dataset = base_dataset

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, index):
        image, grade = self.base_dataset[index]

        h, w = image.shape[-2:]
        empty = torch.zeros(1, h, w, dtype=torch.float32)

        return {
            "image": image,
            "grade": grade,
            "lesion_masks": {
                lesion: empty.clone() for lesion in LESION_TYPES
            },
            "lesion_available": {
                lesion: torch.tensor(False) for lesion in LESION_TYPES
            },
            "image_id": f"APTOS_{index:05d}",
        }


class IDRiDE4Dataset(torch.utils.data.Dataset):
    """Adapter exposing the existing IDRiD dataset in the E4 format."""

    def __init__(self, base_dataset):
        self.base_dataset = base_dataset

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, index):
        return self.base_dataset[index]


def collate_batch(batch):
    images = torch.stack([item["image"] for item in batch])
    grades = torch.tensor(
        [item["grade"] for item in batch],
        dtype=torch.long,
    )

    lesion_masks = {
        lesion: torch.stack(
            [item["lesion_masks"][lesion] for item in batch]
        )
        for lesion in LESION_TYPES
    }

    lesion_available = {
        lesion: torch.stack(
            [
                torch.as_tensor(
                    item["lesion_available"][lesion],
                    dtype=torch.bool,
                )
                for item in batch
            ]
        )
        for lesion in LESION_TYPES
    }

    return {
        "image": images,
        "grade": grades,
        "lesion_masks": lesion_masks,
        "lesion_available": lesion_available,
    }


def evaluate_grading(model, loader, device, criterion):
    model.eval()

    labels = []
    probabilities = []
    losses = []

    with torch.no_grad():
        for batch in loader:
            images = batch["image"].to(device)
            grades = batch["grade"].to(device)

            outputs = model.forward_e3(images)
            logits = outputs["dr_logits"]

            losses.append(
                criterion(logits, grades).item()
            )

            probabilities.append(
                torch.softmax(logits, dim=1)
                .cpu()
                .numpy()
            )
            labels.extend(grades.cpu().tolist())

    metrics = compute_dr_metrics(
        labels,
        np.concatenate(probabilities),
    )

    metrics["loss"] = float(np.mean(losses))
    return metrics


def main():
    _seed_everything(SEED)

    device = select_device()
    print(f"device: {device}")
    print(f"epochs: {EPOCHS}")
    print(f"balanced samples per domain: {DOMAIN_SAMPLES}")
    print(f"batch_size: {BATCH_SIZE}")
    print(f"learning_rate: {LEARNING_RATE}")

    # ------------------------------------------------------------
    # APTOS
    # ------------------------------------------------------------
    aptos_root = (
        PROJECT_ROOT / "data" / "aptos" / "aptos2019"
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

    aptos_train_full = AptosDataset(
        manifest["train"],
        build_train_transform(image_size=IMAGE_SIZE),
    )

    aptos_val = AptosE4Dataset(
        AptosDataset(
            manifest["validation"],
            build_eval_transform(image_size=IMAGE_SIZE),
        )
    )

    aptos_labels = [
        int(record.label)
        for record in manifest["train"]
    ]

    aptos_selected = stratified_indices(
        aptos_labels,
        DOMAIN_SAMPLES,
        SEED,
    )

    aptos_train = Subset(
        AptosE4Dataset(aptos_train_full),
        aptos_selected,
    )

    # ------------------------------------------------------------
    # IDRiD
    # ------------------------------------------------------------
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
        str(row["Image name"]): int(row["Retinopathy grade"])
        for _, row in idrid_df.iterrows()
    }

    # Deterministic stratified split.
    idrid_labels = [
        idrid_label_map[path.stem]
        for path in idrid_images
    ]

    rng = random.Random(SEED)
    by_class = {}

    for index, label in enumerate(idrid_labels):
        by_class.setdefault(label, []).append(index)

    idrid_train_indices = []
    idrid_val_indices = []

    for label in sorted(by_class):
        indices = by_class[label][:]
        rng.shuffle(indices)

        cut = max(1, int(round(len(indices) * 0.80)))
        idrid_train_indices.extend(indices[:cut])
        idrid_val_indices.extend(indices[cut:])

    idrid_train_paths = [
        idrid_images[i] for i in sorted(idrid_train_indices)
    ]
    idrid_val_paths = [
        idrid_images[i] for i in sorted(idrid_val_indices)
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

    idrid_train_labels = [
        idrid_label_map[path.stem]
        for path in idrid_train_paths
    ]

    idrid_selected = stratified_indices(
        idrid_train_labels,
        DOMAIN_SAMPLES,
        SEED,
    )

    idrid_train = Subset(
        IDRiDE4Dataset(idrid_train_base),
        idrid_selected,
    )

    idrid_val = idrid_val_base

    # ------------------------------------------------------------
    # Mixed-domain training
    # ------------------------------------------------------------
    mixed_train = ConcatDataset(
        [
            aptos_train,
            idrid_train,
        ]
    )

    train_loader = DataLoader(
        mixed_train,
        batch_size=BATCH_SIZE,
        shuffle=True,
        generator=torch.Generator().manual_seed(SEED),
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

    # ------------------------------------------------------------
    # Model initialized from E3 best checkpoint
    # ------------------------------------------------------------
    checkpoint_path = (
        PROJECT_ROOT
        / "checkpoints"
        / "e3_resnet50_best.pt"
    )

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Missing E3 checkpoint: {checkpoint_path}"
        )

    model = build_research_resnet50(
        experiment="e3",
        pretrained=False,
    ).to(device)

    checkpoint = torch.load(
        checkpoint_path,
        map_location=device,
        weights_only=False,
    )

    model.load_state_dict(
        checkpoint["model_state"]
    )

    print(f"initialized_from: {checkpoint_path}")
    print(
        f"E3 source epoch: "
        f"{checkpoint.get('epoch', 'unknown')}"
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    class_weights = inverse_frequency_class_weights(
        manifest["train"]
    )

    dr_criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(
            class_weights,
            dtype=torch.float32,
            device=device,
        )
    )

    # ------------------------------------------------------------
    # Training
    # ------------------------------------------------------------
    best_score = float("-inf")

    for epoch in range(1, EPOCHS + 1):
        started = time.perf_counter()

        model.train()

        total_losses = []

        for batch in train_loader:
            images = batch["image"].to(device)
            grades = batch["grade"].to(device)

            lesion_masks = {
                k: v.to(device)
                for k, v in batch["lesion_masks"].items()
            }

            lesion_available = {
                k: v.to(device)
                for k, v in batch["lesion_available"].items()
            }

            optimizer.zero_grad(set_to_none=True)

            outputs = model.forward_e3(images)

            total_loss, loss_values = compute_e3_loss(
                dr_logits=outputs["dr_logits"],
                grades=grades,
                lesion_logits={
                    lesion: outputs[f"{lesion}_logits"]
                    for lesion in LESION_TYPES
                },
                lesion_masks=lesion_masks,
                lesion_available=lesion_available,
                dr_criterion=dr_criterion,
                lesion_weight=LESION_LOSS_WEIGHT,
            )

            total_loss.backward()
            optimizer.step()

            total_losses.append(
                float(total_loss.item())
            )

        aptos_metrics = evaluate_grading(
            model,
            aptos_val_loader,
            device,
            dr_criterion,
        )

        idrid_metrics = evaluate_grading(
            model,
            idrid_val_loader,
            device,
            dr_criterion,
        )

        # Mean QWK is used only as an experimental checkpoint-selection
        # signal across the two validation domains.
        combined_qwk = (
            aptos_metrics["quadratic_weighted_kappa"]
            + idrid_metrics["quadratic_weighted_kappa"]
        ) / 2.0

        checkpoint_out = (
            PROJECT_ROOT
            / "checkpoints"
            / f"e4_domain_epoch_{epoch:03d}.pt"
        )

        metrics = {
            "aptos_validation": aptos_metrics,
            "idrid_validation": idrid_metrics,
            "combined_qwk": combined_qwk,
        }

        save_checkpoint(
            checkpoint_out,
            model,
            optimizer,
            epoch,
            metrics,
            {
                "experiment": "e4_domain",
                "image_size": IMAGE_SIZE,
                "batch_size": BATCH_SIZE,
                "learning_rate": LEARNING_RATE,
                "weight_decay": WEIGHT_DECAY,
                "balanced_domain_samples": DOMAIN_SAMPLES,
                "lesion_loss_weight": LESION_LOSS_WEIGHT,
                "seed": SEED,
                "source_checkpoint": str(checkpoint_path),
            },
            SEED,
        )

        if combined_qwk > best_score:
            best_score = combined_qwk

            best_path = (
                PROJECT_ROOT
                / "checkpoints"
                / "e4_domain_best.pt"
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
            f"\nE4 epoch={epoch}"
            f"\ntrain_loss={np.mean(total_losses):.6f}"
            f"\nAPTOS validation={aptos_metrics}"
            f"\nIDRiD validation={idrid_metrics}"
            f"\ncombined_qwk={combined_qwk:.6f}"
            f"\nwall_clock_seconds="
            f"{time.perf_counter() - started:.2f}"
            f"\ncheckpoint={checkpoint_out}\n"
        )


if __name__ == "__main__":
    main()
