from pathlib import Path
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    cohen_kappa_score,
    roc_auc_score,
    average_precision_score,
    log_loss,
)

from training.datasets.aptos import (
    AptosDataset,
    load_aptos_records,
)
from training.datasets.idrid import IDRiDDataset
from training.models.research_resnet50 import build_research_resnet50
from training.preprocessing.transforms import (
    build_eval_transform,
)
from training.utils.aptos_manifest import (
    load_aptos_manifest_records,
)
from training.utils.config import AptosConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SEED = 42
IMAGE_SIZE = 384
BATCH_SIZE = 8

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

CHECKPOINT = (
    PROJECT_ROOT
    / "checkpoints"
    / "e4_domain_epoch_005.pt"
)

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

APTOS_ROOT = (
    PROJECT_ROOT
    / "data"
    / "aptos"
    / "aptos2019"
)

APTOS_MANIFEST = (
    PROJECT_ROOT
    / "data"
    / "aptos"
    / "aptos2019_split_manifest.csv"
)

IDRID_ROOT = (
    PROJECT_ROOT
    / "data"
    / "idrid"
)

IDRID_DISEASE_ROOT = (
    IDRID_ROOT
    / "B. Disease Grading"
)

IDRID_SEGMENTATION_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
)

IDRID_TRAIN_IMAGE_DIR = (
    IDRID_DISEASE_ROOT
    / "1. Original Images"
    / "a. Training Set"
)

IDRID_TRAIN_LABELS = (
    IDRID_DISEASE_ROOT
    / "2. Groundtruths"
    / "a. IDRiD_Disease Grading_Training Labels.csv"
)

IDRID_TEST_IMAGE_DIR = (
    IDRID_DISEASE_ROOT
    / "1. Original Images"
    / "b. Testing Set"
)

IDRID_TEST_LABELS = (
    IDRID_DISEASE_ROOT
    / "2. Groundtruths"
    / "b. IDRiD_Disease Grading_Testing Labels.csv"
)


def set_seed():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)


# ------------------------------------------------------------
# E4 validation reconstruction
# ------------------------------------------------------------

def stratified_indices(
    labels: list[int],
    n: int,
    seed: int,
) -> list[int]:
    rng = random.Random(seed)

    by_class = {}

    for index, label in enumerate(labels):
        by_class.setdefault(int(label), []).append(index)

    selected = []

    for label in sorted(by_class):
        indices = by_class[label][:]
        rng.shuffle(indices)

        quota = round(
            len(indices) / len(labels) * n
        )

        selected.extend(
            indices[:quota]
        )

    if len(selected) < n:
        selected_set = set(selected)

        remaining = [
            i
            for i in range(len(labels))
            if i not in selected_set
        ]

        rng.shuffle(remaining)

        selected.extend(
            remaining[: n - len(selected)]
        )

    if len(selected) > n:
        rng.shuffle(selected)
        selected = selected[:n]

    return sorted(selected)


class AptosE4Dataset(torch.utils.data.Dataset):

    def __init__(self, base_dataset):
        self.base_dataset = base_dataset

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, index):
        image, grade = self.base_dataset[index]

        return {
            "image": image,
            "grade": grade,
        }


def collate_grading(batch):
    return {
        "image": torch.stack(
            [item["image"] for item in batch]
        ),
        "grade": torch.tensor(
            [item["grade"] for item in batch],
            dtype=torch.long,
        ),
    }


def build_aptos_validation():
    records, failures = load_aptos_records(
        AptosConfig(
            APTOS_ROOT,
            APTOS_ROOT / "train.csv",
            APTOS_ROOT / "train_images",
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
        APTOS_MANIFEST,
        records,
    )

    dataset = AptosE4Dataset(
        AptosDataset(
            manifest["validation"],
            build_eval_transform(
                image_size=IMAGE_SIZE
            ),
        )
    )

    return DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=collate_grading,
    )


def build_idrid_validation():
    image_paths = sorted(
        IDRID_TRAIN_IMAGE_DIR.glob("*.jpg")
    )

    df = pd.read_csv(
        IDRID_TRAIN_LABELS
    )

    label_map = {
        str(row["Image name"]): int(
            row["Retinopathy grade"]
        )
        for _, row in df.iterrows()
    }

    labels = [
        label_map[path.stem]
        for path in image_paths
    ]

    rng = random.Random(SEED)

    by_class = {}

    for index, label in enumerate(labels):
        by_class.setdefault(
            int(label),
            [],
        ).append(index)

    val_indices = []

    for label in sorted(by_class):
        indices = by_class[label][:]
        rng.shuffle(indices)

        cut = max(
            1,
            int(round(len(indices) * 0.80)),
        )

        val_indices.extend(
            indices[cut:]
        )

    val_indices = sorted(val_indices)

    val_paths = [
        image_paths[index]
        for index in val_indices
    ]

    dataset = IDRiDDataset(
        image_paths=val_paths,
        grading_csv=IDRID_TRAIN_LABELS,
        segmentation_root=IDRID_SEGMENTATION_ROOT / "a. Training Set",
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    return dataset


# ------------------------------------------------------------
# Logit collection
# ------------------------------------------------------------

def collect_aptos_logits(
    model,
    loader,
):
    logits_all = []
    labels_all = []

    model.eval()

    with torch.no_grad():
        for batch in loader:
            if isinstance(batch, dict):
                images = batch["image"].to(DEVICE)
                labels = batch["grade"]
            else:
                images = batch[0].to(DEVICE)
                labels = batch[1]

            logits = model.forward_e3(
                images
            )["dr_logits"]

            logits_all.append(
                logits.cpu()
            )

            labels_all.extend(
                labels.tolist()
            )

    return (
        torch.cat(logits_all),
        torch.tensor(
            labels_all,
            dtype=torch.long,
        ),
    )


def collect_idrid_logits(
    model,
    dataset,
):
    logits_all = []
    labels_all = []

    model.eval()

    with torch.no_grad():
        for index in range(len(dataset)):
            sample = dataset[index]

            image = (
                sample["image"]
                .unsqueeze(0)
                .to(DEVICE)
            )

            logits = model.forward_e3(
                image
            )["dr_logits"]

            logits_all.append(
                logits.cpu()
            )

            labels_all.append(
                int(sample["grade"])
            )

    return (
        torch.cat(logits_all),
        torch.tensor(
            labels_all,
            dtype=torch.long,
        ),
    )


# ------------------------------------------------------------
# Temperature scaling
# ------------------------------------------------------------

def fit_temperature(
    logits,
    labels,
):
    temperature = torch.nn.Parameter(
        torch.ones(1)
    )

    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.LBFGS(
        [temperature],
        lr=0.01,
        max_iter=100,
        line_search_fn="strong_wolfe",
    )

    def closure():
        optimizer.zero_grad()

        # Keep temperature positive.
        temp = torch.clamp(
            temperature,
            min=0.05,
            max=20.0,
        )

        loss = criterion(
            logits / temp,
            labels,
        )

        loss.backward()

        return loss

    optimizer.step(
        closure
    )

    return float(
        torch.clamp(
            temperature.detach(),
            min=0.05,
            max=20.0,
        ).item()
    )


# ------------------------------------------------------------
# Evaluation
# ------------------------------------------------------------

def evaluate(
    name,
    logits,
    labels,
    temperature,
):
    logits = logits.numpy()
    labels = labels.numpy()

    probabilities = torch.softmax(
        torch.tensor(logits)
        / temperature,
        dim=1,
    ).numpy()

    predictions = probabilities.argmax(
        axis=1
    )

    accuracy = accuracy_score(
        labels,
        predictions,
    )

    macro_f1 = f1_score(
        labels,
        predictions,
        average="macro",
        zero_division=0,
    )

    qwk = cohen_kappa_score(
        labels,
        predictions,
        weights="quadratic",
    )

    nll = log_loss(
        labels,
        probabilities,
        labels=[0, 1, 2, 3, 4],
    )

    y_true_ref = (
        labels >= 2
    ).astype(int)

    y_pred_ref = (
        predictions >= 2
    ).astype(int)

    tp = int(
        (
            (y_true_ref == 1)
            & (y_pred_ref == 1)
        ).sum()
    )

    tn = int(
        (
            (y_true_ref == 0)
            & (y_pred_ref == 0)
        ).sum()
    )

    fp = int(
        (
            (y_true_ref == 0)
            & (y_pred_ref == 1)
        ).sum()
    )

    fn = int(
        (
            (y_true_ref == 1)
            & (y_pred_ref == 0)
        ).sum()
    )

    sensitivity = (
        tp / (tp + fn)
        if tp + fn
        else float("nan")
    )

    specificity = (
        tn / (tn + fp)
        if tn + fp
        else float("nan")
    )

    referable_probability = (
        probabilities[:, 2:].sum(axis=1)
    )

    roc_auc = roc_auc_score(
        y_true_ref,
        referable_probability,
    )

    pr_auc = average_precision_score(
        y_true_ref,
        referable_probability,
    )

    print()
    print(
        f"================ {name} ================"
    )
    print(
        f"temperature: {temperature:.6f}"
    )
    print(
        f"accuracy: {accuracy:.6f}"
    )
    print(
        f"macro F1: {macro_f1:.6f}"
    )
    print(
        f"QWK: {qwk:.6f}"
    )
    print(
        f"NLL: {nll:.6f}"
    )

    print()
    print("Per-class metrics:")
    print(
        classification_report(
            labels,
            predictions,
            labels=[0, 1, 2, 3, 4],
            digits=6,
            zero_division=0,
        )
    )

    print("Confusion matrix:")
    print(
        confusion_matrix(
            labels,
            predictions,
            labels=[0, 1, 2, 3, 4],
        )
    )

    print()
    print("Referable DR")
    print("definition: grade >= 2")
    print(
        f"sensitivity: {sensitivity:.6f}"
    )
    print(
        f"specificity: {specificity:.6f}"
    )
    print(
        f"ROC-AUC: {roc_auc:.6f}"
    )
    print(
        f"PR-AUC: {pr_auc:.6f}"
    )

    return {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "qwk": qwk,
        "nll": nll,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
    }


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():
    set_seed()

    print(
        f"device: {DEVICE}"
    )
    print(
        f"checkpoint: {CHECKPOINT}"
    )

    if not CHECKPOINT.exists():
        raise FileNotFoundError(
            f"Missing checkpoint: {CHECKPOINT}"
        )

    checkpoint = torch.load(
        CHECKPOINT,
        map_location=DEVICE,
        weights_only=False,
    )

    model = build_research_resnet50(
        experiment="e3",
        pretrained=False,
    )

    model.load_state_dict(
        checkpoint["model_state"],
        strict=True,
    )

    model.to(DEVICE)
    model.eval()

    print(
        f"E4 checkpoint epoch: "
        f"{checkpoint.get('epoch')}"
    )

    # --------------------------------------------------------
    # Validation predictions
    # --------------------------------------------------------

    aptos_loader = (
        build_aptos_validation()
    )

    idrid_validation = (
        build_idrid_validation()
    )

    aptos_val_logits, aptos_val_labels = (
        collect_aptos_logits(
            model,
            aptos_loader,
        )
    )

    idrid_val_logits, idrid_val_labels = (
        collect_idrid_logits(
            model,
            idrid_validation,
        )
    )

    calibration_logits = torch.cat(
        [
            aptos_val_logits,
            idrid_val_logits,
        ]
    )

    calibration_labels = torch.cat(
        [
            aptos_val_labels,
            idrid_val_labels,
        ]
    )

    print()
    print(
        "Calibration samples:"
    )
    print(
        f"APTOS validation: "
        f"{len(aptos_val_labels)}"
    )
    print(
        f"IDRiD validation: "
        f"{len(idrid_val_labels)}"
    )
    print(
        f"Combined: "
        f"{len(calibration_labels)}"
    )

    temperature = fit_temperature(
        calibration_logits,
        calibration_labels,
    )

    print()
    print(
        "================ E5 CALIBRATION ================"
    )
    print(
        f"fitted temperature: "
        f"{temperature:.6f}"
    )

    # --------------------------------------------------------
    # Validation calibration result
    # --------------------------------------------------------

    evaluate(
        "E5 POOLED VALIDATION",
        calibration_logits,
        calibration_labels,
        temperature,
    )

    # --------------------------------------------------------
    # APTOS locked test
    # --------------------------------------------------------

    records, failures = load_aptos_records(
        AptosConfig(
            APTOS_ROOT,
            APTOS_ROOT / "train.csv",
            APTOS_ROOT / "train_images",
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
        APTOS_MANIFEST,
        records,
    )

    aptos_test = AptosDataset(
        manifest["test"],
        build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    aptos_test_loader = DataLoader(
        aptos_test,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    aptos_test_logits, aptos_test_labels = (
        collect_aptos_logits(
            model,
            aptos_test_loader,
        )
    )

    evaluate(
        "E5 APTOS LOCKED TEST",
        aptos_test_logits,
        aptos_test_labels,
        temperature,
    )

    # --------------------------------------------------------
    # IDRiD official test
    # --------------------------------------------------------

    idrid_test_images = sorted(
        IDRID_TEST_IMAGE_DIR.glob("*.jpg")
    )

    idrid_test = IDRiDDataset(
        image_paths=idrid_test_images,
        grading_csv=IDRID_TEST_LABELS,
        segmentation_root=(
            IDRID_SEGMENTATION_ROOT
            / "b. Testing Set"
        ),
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    idrid_test_logits, idrid_test_labels = (
        collect_idrid_logits(
            model,
            idrid_test,
        )
    )

    evaluate(
        "E5 IDRiD OFFICIAL TEST",
        idrid_test_logits,
        idrid_test_labels,
        temperature,
    )

    print()
    print(
        "E5 completed without retraining."
    )
    print(
        "The E4 model weights remained frozen."
    )
    print(
        "Calibration used only the reconstructed "
        "E4 validation partitions."
    )
    print(
        "APTOS and IDRiD official test sets "
        "were not used to fit temperature."
    )


if __name__ == "__main__":
    main()
