from pathlib import Path
import random

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    cohen_kappa_score,
    confusion_matrix,
    classification_report,
)

from training.datasets.aptos import AptosDataset, load_aptos_records
from training.datasets.idrid import IDRiDDataset
from training.models.e8_referable_resnet50 import build_e8_referable_resnet50
from training.preprocessing.transforms import build_eval_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SEED = 42
IMAGE_SIZE = 384
BATCH_SIZE = 2
NUM_CLASSES = 5

# E9-specific temperature fitted on pooled validation data only.
TEMPERATURE = 2.069366

ALPHA = 0.10

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

CHECKPOINT = (
    PROJECT_ROOT
    / "checkpoints"
    / "e9_full_referable_best.pt"
)

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

IDRID_ROOT = PROJECT_ROOT / "data" / "idrid"

IDRID_DISEASE_ROOT = (
    IDRID_ROOT / "B. Disease Grading"
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


class AptosDatasetWrapper(torch.utils.data.Dataset):
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

    dataset = AptosDatasetWrapper(
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


def build_aptos_test():
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

    dataset = AptosDataset(
        manifest["test"],
        build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    return DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
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

    return IDRiDDataset(
        image_paths=val_paths,
        grading_csv=IDRID_TRAIN_LABELS,
        segmentation_root=(
            IDRID_SEGMENTATION_ROOT
            / "a. Training Set"
        ),
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )


def build_idrid_test():
    image_paths = sorted(
        IDRID_TEST_IMAGE_DIR.glob("*.jpg")
    )

    return IDRiDDataset(
        image_paths=image_paths,
        grading_csv=IDRID_TEST_LABELS,
        segmentation_root=(
            IDRID_SEGMENTATION_ROOT
            / "b. Testing Set"
        ),
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )


def collect_logits_from_loader(model, loader):
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

            output = model.forward_e8(images)
            logits = output["dr_logits"]

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


def collect_logits_from_dataset(model, dataset):
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

            output = model.forward_e8(image)
            logits = output["dr_logits"]

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


def calibrated_probabilities(logits):
    return torch.softmax(
        logits / TEMPERATURE,
        dim=1,
    )


def conformal_threshold(
    logits,
    labels,
    alpha=ALPHA,
):
    probabilities = calibrated_probabilities(
        logits
    )

    true_probabilities = probabilities[
        torch.arange(len(labels)),
        labels,
    ]

    scores = (
        1.0 - true_probabilities
    )

    scores = torch.sort(scores).values

    n = len(scores)

    rank = int(
        np.ceil(
            (n + 1) * (1.0 - alpha)
        )
    )

    rank = min(
        max(rank, 1),
        n,
    )

    return float(
        scores[rank - 1].item()
    )


def make_prediction_sets(
    probabilities,
    threshold,
):
    sets = []

    for row in probabilities:
        selected = [
            grade
            for grade in range(NUM_CLASSES)
            if float(row[grade])
            >= 1.0 - threshold
        ]

        if not selected:
            selected = [
                int(torch.argmax(row).item())
            ]

        sets.append(selected)

    return sets


def ordinal_interval(prediction_set):
    return (
        min(prediction_set),
        max(prediction_set),
    )


def evaluate(
    name,
    logits,
    labels,
    threshold,
):
    probabilities = calibrated_probabilities(
        logits
    ).numpy()

    labels_np = labels.numpy()

    predictions = probabilities.argmax(
        axis=1
    )

    prediction_sets = make_prediction_sets(
        probabilities,
        threshold,
    )

    set_sizes = np.array(
        [
            len(item)
            for item in prediction_sets
        ]
    )

    coverage = np.mean(
        [
            int(label) in prediction_set
            for label, prediction_set
            in zip(
                labels_np,
                prediction_sets,
            )
        ]
    )

    mean_set_size = float(
        np.mean(set_sizes)
    )

    singleton_rate = float(
        np.mean(set_sizes == 1)
    )

    wide_set_rate = float(
        np.mean(set_sizes >= 4)
    )

    intervals = [
        ordinal_interval(item)
        for item in prediction_sets
    ]

    interval_widths = np.array(
        [
            high - low
            for low, high in intervals
        ]
    )

    mean_interval_width = float(
        np.mean(interval_widths)
    )

    accuracy = accuracy_score(
        labels_np,
        predictions,
    )

    macro_f1 = f1_score(
        labels_np,
        predictions,
        average="macro",
        zero_division=0,
    )

    qwk = cohen_kappa_score(
        labels_np,
        predictions,
        weights="quadratic",
    )

    print()
    print(
        f"================ {name} ================"
    )

    print(
        f"conformal threshold: "
        f"{threshold:.6f}"
    )

    print(
        f"empirical coverage: "
        f"{coverage:.6f}"
    )

    print(
        f"target coverage: "
        f"{1.0 - ALPHA:.6f}"
    )

    print(
        f"mean prediction-set size: "
        f"{mean_set_size:.6f}"
    )

    print(
        f"singleton prediction rate: "
        f"{singleton_rate:.6f}"
    )

    print(
        f"wide-set rate (>=4): "
        f"{wide_set_rate:.6f}"
    )

    print(
        f"mean ordinal interval width: "
        f"{mean_interval_width:.6f}"
    )

    print()
    print(
        f"accuracy: {accuracy:.6f}"
    )

    print(
        f"macro F1: {macro_f1:.6f}"
    )

    print(
        f"QWK: {qwk:.6f}"
    )

    print()
    print("Per-class metrics:")

    print(
        classification_report(
            labels_np,
            predictions,
            labels=[0, 1, 2, 3, 4],
            digits=6,
            zero_division=0,
        )
    )

    print("Confusion matrix:")

    print(
        confusion_matrix(
            labels_np,
            predictions,
            labels=[0, 1, 2, 3, 4],
        )
    )

    narrow = set_sizes == 1
    moderate = (
        (set_sizes >= 2)
        & (set_sizes <= 3)
    )
    high = set_sizes >= 4

    print()
    print("Uncertainty distribution:")

    print(
        f"narrow (1 grade): "
        f"{np.mean(narrow):.6f}"
    )

    print(
        f"moderate (2-3 grades): "
        f"{np.mean(moderate):.6f}"
    )

    print(
        f"high (4-5 grades): "
        f"{np.mean(high):.6f}"
    )

    return {
        "coverage": coverage,
        "mean_set_size": mean_set_size,
        "singleton_rate": singleton_rate,
        "wide_set_rate": wide_set_rate,
        "mean_interval_width": mean_interval_width,
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "qwk": qwk,
    }


def main():
    set_seed()

    print(f"device: {DEVICE}")
    print(f"checkpoint: {CHECKPOINT}")
    print(f"E9 calibration temperature: {TEMPERATURE}")

    checkpoint = torch.load(
        CHECKPOINT,
        map_location=DEVICE,
        weights_only=False,
    )

    model = build_e8_referable_resnet50(
        pretrained=False,
    )

    model.load_state_dict(
        checkpoint["model_state"],
        strict=True,
    )

    model.to(DEVICE)
    model.eval()

    print(
        f"E9 checkpoint epoch: "
        f"{checkpoint.get('epoch')}"
    )

    aptos_val_loader = build_aptos_validation()
    idrid_val_dataset = build_idrid_validation()

    aptos_val_logits, aptos_val_labels = (
        collect_logits_from_loader(
            model,
            aptos_val_loader,
        )
    )

    idrid_val_logits, idrid_val_labels = (
        collect_logits_from_dataset(
            model,
            idrid_val_dataset,
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
    print("E6 E9 calibration data:")
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

    threshold = conformal_threshold(
        calibration_logits,
        calibration_labels,
        alpha=ALPHA,
    )

    print()
    print(
        "================ E6 E9 CONFORMAL CALIBRATION ================"
    )
    print(f"alpha: {ALPHA:.2f}")
    print(f"nominal coverage: {1.0 - ALPHA:.2f}")
    print(f"threshold: {threshold:.6f}")

    evaluate(
        "E9 POOLED VALIDATION",
        calibration_logits,
        calibration_labels,
        threshold,
    )

    # --------------------------------------------------------
    # Locked APTOS test
    # --------------------------------------------------------

    aptos_test_loader = build_aptos_test()

    aptos_test_logits, aptos_test_labels = (
        collect_logits_from_loader(
            model,
            aptos_test_loader,
        )
    )

    evaluate(
        "E9 APTOS LOCKED TEST",
        aptos_test_logits,
        aptos_test_labels,
        threshold,
    )

    # --------------------------------------------------------
    # Official IDRiD test
    # --------------------------------------------------------

    idrid_test_dataset = build_idrid_test()

    idrid_test_logits, idrid_test_labels = (
        collect_logits_from_dataset(
            model,
            idrid_test_dataset,
        )
    )

    evaluate(
        "E9 IDRiD OFFICIAL TEST",
        idrid_test_logits,
        idrid_test_labels,
        threshold,
    )

    print()
    print("E9 conformal calibration completed.")
    print("No retraining was performed.")
    print("E9 model weights remained frozen.")
    print(
        f"E9 temperature remained fixed at "
        f"{TEMPERATURE:.6f}."
    )
    print(
        "Conformal threshold was fitted using "
        "validation predictions only."
    )
    print(
        "APTOS and IDRiD official test sets were "
        "not used to fit the conformal threshold."
    )


if __name__ == "__main__":
    main()
