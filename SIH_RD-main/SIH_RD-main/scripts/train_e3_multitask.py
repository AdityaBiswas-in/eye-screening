from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, Subset

from training.datasets.idrid import IDRiDDataset
from training.losses.e3_multitask import compute_e3_loss
from training.models.research_resnet50 import build_research_resnet50
from training.preprocessing.transforms import build_eval_transform


PROJECT_ROOT = Path(__file__).resolve().parents[1]

E2_CHECKPOINT = PROJECT_ROOT / "checkpoints" / "e2_resnet50_epoch_005.pt"

IDRID_ROOT = PROJECT_ROOT / "data" / "idrid"

CHECKPOINT_DIR = PROJECT_ROOT / "checkpoints"
CHECKPOINT_DIR.mkdir(exist_ok=True)

SPLIT_PATH = PROJECT_ROOT / "configs" / "idrid_e3_split.json"

IMAGE_SIZE = 384
BATCH_SIZE = 2
EPOCHS = 10
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-4
LESION_WEIGHT = 1.0
SEED = 42
VAL_FRACTION = 0.20


LESION_TYPES = ("ma", "he", "ex", "se")


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")

    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


def build_idrid_dataset():
    transform = build_eval_transform(
        image_size=IMAGE_SIZE
    )

    image_dir = (
        IDRID_ROOT
        / "B. Disease Grading"
        / "1. Original Images"
        / "a. Training Set"
    )

    grading_csv = (
        IDRID_ROOT
        / "B. Disease Grading"
        / "2. Groundtruths"
        / "a. IDRiD_Disease Grading_Training Labels.csv"
    )

    segmentation_root = (
        IDRID_ROOT
        / "A. Segmentation"
        / "2. All Segmentation Groundtruths"
        / "a. Training Set"
    )

    image_paths = sorted(image_dir.glob("*.jpg"))

    if len(image_paths) != 413:
        raise RuntimeError(
            f"Expected 413 IDRiD training images, found {len(image_paths)}"
        )

    return IDRiDDataset(
        image_paths=image_paths,
        grading_csv=grading_csv,
        segmentation_root=segmentation_root,
        transform=transform,
    )


def make_stratified_split(dataset):
    labels = np.array(
        [record["grade"] for record in dataset.records],
        dtype=np.int64,
    )

    rng = np.random.default_rng(SEED)

    train_indices = []
    val_indices = []

    for grade in sorted(np.unique(labels)):
        indices = np.where(labels == grade)[0]
        indices = indices.copy()
        rng.shuffle(indices)

        n_val = max(
            1,
            int(round(len(indices) * VAL_FRACTION)),
        )

        val_indices.extend(indices[:n_val].tolist())
        train_indices.extend(indices[n_val:].tolist())

    train_indices = sorted(train_indices)
    val_indices = sorted(val_indices)

    if set(train_indices) & set(val_indices):
        raise RuntimeError("IDRiD train/validation overlap detected.")

    if len(train_indices) + len(val_indices) != len(dataset):
        raise RuntimeError("IDRiD split does not cover the dataset exactly.")

    payload = {
        "seed": SEED,
        "validation_fraction": VAL_FRACTION,
        "train_indices": train_indices,
        "validation_indices": val_indices,
        "train_image_ids": [
            dataset.records[i]["image_id"]
            for i in train_indices
        ],
        "validation_image_ids": [
            dataset.records[i]["image_id"]
            for i in val_indices
        ],
    }

    SPLIT_PATH.write_text(
        json.dumps(payload, indent=2)
    )

    return train_indices, val_indices


def load_or_create_split(dataset):
    if SPLIT_PATH.exists():
        payload = json.loads(
            SPLIT_PATH.read_text()
        )

        if payload["seed"] != SEED:
            raise RuntimeError(
                "Existing IDRiD split was created with another seed."
            )

        train_indices = payload["train_indices"]
        val_indices = payload["validation_indices"]

        if set(train_indices) & set(val_indices):
            raise RuntimeError(
                "Stored IDRiD split contains overlap."
            )

        if len(train_indices) + len(val_indices) != len(dataset):
            raise RuntimeError(
                "Stored IDRiD split does not cover all 413 images."
            )

        return train_indices, val_indices

    return make_stratified_split(dataset)


def print_split_statistics(dataset, train_indices, val_indices):
    def counts(indices):
        values = [
            dataset.records[i]["grade"]
            for i in indices
        ]

        return {
            str(grade): int(values.count(grade))
            for grade in range(5)
        }

    print("IDRiD split")
    print("  train:", len(train_indices), counts(train_indices))
    print("  val:  ", len(val_indices), counts(val_indices))
    print("  split:", SPLIT_PATH)


def compute_dr_class_weights(dataset, train_indices, device):
    counts = np.zeros(5, dtype=np.float64)

    for index in train_indices:
        grade = dataset.records[index]["grade"]
        counts[grade] += 1

    if np.any(counts == 0):
        raise RuntimeError(
            f"Missing DR grade in training split: {counts}"
        )

    weights = counts.sum() / (5.0 * counts)

    return torch.tensor(
        weights,
        dtype=torch.float32,
        device=device,
    )


def load_e2_weights(model):
    checkpoint = torch.load(
        E2_CHECKPOINT,
        map_location="cpu",
        weights_only=False,
    )

    result = model.load_state_dict(
        checkpoint["model_state"],
        strict=False,
    )

    missing = list(result.missing_keys)
    unexpected = list(result.unexpected_keys)

    allowed_missing_prefixes = (
        "lesion_decoder.",
        "lesion_heads.",
    )

    unexpected_allowed = []

    if unexpected != unexpected_allowed:
        raise RuntimeError(
            f"Unexpected E2 checkpoint keys: {unexpected}"
        )

    invalid_missing = [
        key
        for key in missing
        if not key.startswith(allowed_missing_prefixes)
    ]

    if invalid_missing:
        raise RuntimeError(
            "Unexpected non-E3 missing parameters: "
            f"{invalid_missing}"
        )

    print("E2 initialization")
    print("  checkpoint:", E2_CHECKPOINT)
    print("  epoch:", checkpoint["epoch"])
    print("  seed:", checkpoint["seed"])
    print("  weight transfer: PASS")

    return checkpoint


def prepare_batch(batch, device):
    images = batch["image"].to(device)
    grades = batch["grade"].to(device)

    lesion_masks = {
        lesion: batch["lesion_masks"][lesion].to(device)
        for lesion in LESION_TYPES
    }

    lesion_available = {
        lesion: batch["lesion_available"][lesion].to(device)
        for lesion in LESION_TYPES
    }

    return (
        images,
        grades,
        lesion_masks,
        lesion_available,
    )


def calculate_referable_metrics(logits, grades):
    probabilities = torch.softmax(logits, dim=1)

    predictions = probabilities.argmax(dim=1)

    true_ref = grades >= 2
    pred_ref = predictions >= 2

    tp = ((pred_ref == 1) & (true_ref == 1)).sum().item()
    tn = ((pred_ref == 0) & (true_ref == 0)).sum().item()
    fp = ((pred_ref == 1) & (true_ref == 0)).sum().item()
    fn = ((pred_ref == 0) & (true_ref == 1)).sum().item()

    sensitivity = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else 0.0
    )

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else 0.0
    )

    return sensitivity, specificity


def calculate_qwk(predictions, targets):
    from sklearn.metrics import cohen_kappa_score

    return float(
        cohen_kappa_score(
            targets,
            predictions,
            weights="quadratic",
        )
    )


def train_one_epoch(
    model,
    loader,
    optimizer,
    criterion,
    device,
):
    model.train()

    total = 0.0
    dr_total = 0.0
    lesion_total = 0.0

    lesion_components = {
        lesion: 0.0
        for lesion in LESION_TYPES
    }

    for batch in loader:
        (
            images,
            grades,
            lesion_masks,
            lesion_available,
        ) = prepare_batch(batch, device)

        optimizer.zero_grad(set_to_none=True)

        outputs = model.forward_e3(images)

        lesion_logits = {
            lesion: outputs[f"{lesion}_logits"]
            for lesion in LESION_TYPES
        }

        loss, values = compute_e3_loss(
            dr_logits=outputs["dr_logits"],
            grades=grades,
            lesion_logits=lesion_logits,
            lesion_masks=lesion_masks,
            lesion_available=lesion_available,
            dr_criterion=criterion,
            lesion_weight=LESION_WEIGHT,
        )

        loss.backward()
        optimizer.step()

        total += values["total"]
        dr_total += values["dr"]
        lesion_total += values["lesion"]

        for lesion in LESION_TYPES:
            lesion_components[lesion] += values[lesion]

    n = len(loader)

    result = {
        "loss": total / n,
        "dr_loss": dr_total / n,
        "lesion_loss": lesion_total / n,
    }

    for lesion in LESION_TYPES:
        result[f"{lesion}_loss"] = (
            lesion_components[lesion] / n
        )

    return result


@torch.no_grad()
def validate(
    model,
    loader,
    criterion,
    device,
):
    model.eval()

    total_loss = 0.0

    all_predictions = []
    all_targets = []

    for batch in loader:
        (
            images,
            grades,
            lesion_masks,
            lesion_available,
        ) = prepare_batch(batch, device)

        outputs = model.forward_e3(images)

        lesion_logits = {
            lesion: outputs[f"{lesion}_logits"]
            for lesion in LESION_TYPES
        }

        loss, _ = compute_e3_loss(
            dr_logits=outputs["dr_logits"],
            grades=grades,
            lesion_logits=lesion_logits,
            lesion_masks=lesion_masks,
            lesion_available=lesion_available,
            dr_criterion=criterion,
            lesion_weight=LESION_WEIGHT,
        )

        total_loss += float(
            loss.detach().cpu()
        )

        predictions = (
            outputs["dr_logits"]
            .argmax(dim=1)
            .detach()
            .cpu()
            .tolist()
        )

        targets = (
            grades.detach()
            .cpu()
            .tolist()
        )

        all_predictions.extend(predictions)
        all_targets.extend(targets)

    accuracy = float(
        np.mean(
            np.array(all_predictions)
            == np.array(all_targets)
        )
    )

    qwk = calculate_qwk(
        all_predictions,
        all_targets,
    )

    sensitivity, specificity = (
        calculate_referable_metrics(
            torch.tensor(
                np.eye(5)[all_predictions],
                dtype=torch.float32,
            ),
            torch.tensor(all_targets),
        )
    )

    return {
        "loss": total_loss / len(loader),
        "accuracy": accuracy,
        "qwk": qwk,
        "referable_sensitivity": sensitivity,
        "referable_specificity": specificity,
    }


def save_e3_checkpoint(
    model,
    optimizer,
    epoch,
    train_metrics,
    validation_metrics,
):
    path = (
        CHECKPOINT_DIR
        / f"e3_resnet50_epoch_{epoch:03d}.pt"
    )

    checkpoint = {
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "epoch": epoch,
        "validation_metrics": validation_metrics,
        "configuration": {
            "experiment": "e3",
            "base_checkpoint": str(E2_CHECKPOINT),
            "image_size": IMAGE_SIZE,
            "batch_size": BATCH_SIZE,
            "epochs": EPOCHS,
            "learning_rate": LEARNING_RATE,
            "weight_decay": WEIGHT_DECAY,
            "lesion_weight": LESION_WEIGHT,
            "seed": SEED,
            "idrid_split": str(SPLIT_PATH),
            "train_metrics": train_metrics,
        },
        "seed": SEED,
    }

    torch.save(
        checkpoint,
        path,
    )

    return path


def run_training():
    seed_everything(SEED)

    device = get_device()

    print("device:", device)

    dataset = build_idrid_dataset()

    train_indices, val_indices = (
        load_or_create_split(dataset)
    )

    print_split_statistics(
        dataset,
        train_indices,
        val_indices,
    )

    train_dataset = Subset(
        dataset,
        train_indices,
    )

    val_dataset = Subset(
        dataset,
        val_indices,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        pin_memory=False,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=False,
    )

    model = build_research_resnet50(
        experiment="e3",
        pretrained=True,
    ).to(device)

    load_e2_weights(model)

    class_weights = compute_dr_class_weights(
        dataset,
        train_indices,
        device,
    )

    criterion = torch.nn.CrossEntropyLoss(
        weight=class_weights,
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    best_qwk = float("-inf")

    print("\nStarting E3 training")
    print("  epochs:", EPOCHS)
    print("  batch size:", BATCH_SIZE)
    print("  lesion weight:", LESION_WEIGHT)

    for epoch in range(1, EPOCHS + 1):
        start = time.time()

        train_metrics = train_one_epoch(
            model,
            train_loader,
            optimizer,
            criterion,
            device,
        )

        validation_metrics = validate(
            model,
            val_loader,
            criterion,
            device,
        )

        elapsed = time.time() - start

        checkpoint = save_e3_checkpoint(
            model,
            optimizer,
            epoch,
            train_metrics,
            validation_metrics,
        )

        print(
            f"\nEpoch {epoch}/{EPOCHS}"
        )

        print(
            "  train loss:",
            f"{train_metrics['loss']:.4f}",
        )

        print(
            "  DR loss:",
            f"{train_metrics['dr_loss']:.4f}",
        )

        print(
            "  lesion loss:",
            f"{train_metrics['lesion_loss']:.4f}",
        )

        print(
            "  MA:",
            f"{train_metrics['ma_loss']:.4f}",
            "HE:",
            f"{train_metrics['he_loss']:.4f}",
            "EX:",
            f"{train_metrics['ex_loss']:.4f}",
            "SE:",
            f"{train_metrics['se_loss']:.4f}",
        )

        print(
            "  val loss:",
            f"{validation_metrics['loss']:.4f}",
        )

        print(
            "  val accuracy:",
            f"{validation_metrics['accuracy']:.4f}",
        )

        print(
            "  val QWK:",
            f"{validation_metrics['qwk']:.4f}",
        )

        print(
            "  val referable sensitivity:",
            f"{validation_metrics['referable_sensitivity']:.4f}",
        )

        print(
            "  val referable specificity:",
            f"{validation_metrics['referable_specificity']:.4f}",
        )

        print(
            "  wall clock:",
            f"{elapsed:.2f}s",
        )

        print(
            "  checkpoint:",
            checkpoint,
        )

        if validation_metrics["qwk"] > best_qwk:
            best_qwk = validation_metrics["qwk"]

            best_path = (
                CHECKPOINT_DIR
                / "e3_resnet50_best.pt"
            )

            torch.save(
                torch.load(
                    checkpoint,
                    map_location="cpu",
                    weights_only=False,
                ),
                best_path,
            )

            print(
                "  BEST E3 checkpoint updated."
            )


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--smoke-test",
        action="store_true",
    )

    args = parser.parse_args()

    if args.smoke_test:
        raise RuntimeError(
            "The previous E3 smoke-test trainer has "
            "already passed. Use the normal command "
            "to start the training run."
        )

    run_training()


if __name__ == "__main__":
    main()
