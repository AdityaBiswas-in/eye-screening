from pathlib import Path
import random

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader

from sklearn.metrics import log_loss

from training.datasets.aptos import (
    AptosDataset,
    load_aptos_records,
)
from training.datasets.idrid import IDRiDDataset
from training.models.e8_referable_resnet50 import (
    build_e8_referable_resnet50,
)
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
BATCH_SIZE = 2

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

IDRID_ROOT = (
    PROJECT_ROOT
    / "data"
    / "idrid"
)

IDRID_TRAIN_IMAGE_DIR = (
    IDRID_ROOT
    / "B. Disease Grading"
    / "1. Original Images"
    / "a. Training Set"
)

IDRID_TRAIN_LABELS = (
    IDRID_ROOT
    / "B. Disease Grading"
    / "2. Groundtruths"
    / "a. IDRiD_Disease Grading_Training Labels.csv"
)

IDRID_SEGMENTATION_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
    / "a. Training Set"
)


def set_seed():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)


class AptosE9Dataset(torch.utils.data.Dataset):

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

    dataset = AptosE9Dataset(
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

    return IDRiDDataset(
        image_paths=val_paths,
        grading_csv=IDRID_TRAIN_LABELS,
        segmentation_root=IDRID_SEGMENTATION_ROOT,
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )


def collect_aptos_logits(model, loader):

    logits_all = []
    labels_all = []

    model.eval()

    with torch.no_grad():

        for batch in loader:

            images = batch["image"].to(DEVICE)
            labels = batch["grade"]

            output = model.forward_e8(images)

            logits_all.append(
                output["dr_logits"].cpu()
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


def collect_idrid_logits(model, dataset):

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

            logits_all.append(
                output["dr_logits"].cpu()
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


def fit_temperature(logits, labels):

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

    optimizer.step(closure)

    return float(
        torch.clamp(
            temperature.detach(),
            min=0.05,
            max=20.0,
        ).item()
    )


def expected_calibration_error(
    probabilities,
    labels,
    bins=15,
):

    confidences = probabilities.max(axis=1)
    predictions = probabilities.argmax(axis=1)

    ece = 0.0

    edges = np.linspace(
        0.0,
        1.0,
        bins + 1,
    )

    for lower, upper in zip(
        edges[:-1],
        edges[1:],
    ):

        if upper == 1.0:
            mask = (
                (confidences >= lower)
                & (confidences <= upper)
            )
        else:
            mask = (
                (confidences >= lower)
                & (confidences < upper)
            )

        if not np.any(mask):
            continue

        accuracy = (
            predictions[mask]
            == labels[mask]
        ).mean()

        confidence = (
            confidences[mask]
            .mean()
        )

        ece += (
            mask.mean()
            * abs(accuracy - confidence)
        )

    return float(ece)


def brier_score_multiclass(
    probabilities,
    labels,
):

    one_hot = np.zeros_like(
        probabilities
    )

    one_hot[
        np.arange(len(labels)),
        labels,
    ] = 1.0

    return float(
        np.mean(
            np.sum(
                (
                    probabilities
                    - one_hot
                ) ** 2,
                axis=1,
            )
        )
    )


def evaluate_calibration(
    name,
    logits,
    labels,
    temperature,
):

    probabilities = torch.softmax(
        logits / temperature,
        dim=1,
    ).numpy()

    labels_np = labels.numpy()

    nll = log_loss(
        labels_np,
        probabilities,
        labels=[0, 1, 2, 3, 4],
    )

    ece = expected_calibration_error(
        probabilities,
        labels_np,
    )

    brier = brier_score_multiclass(
        probabilities,
        labels_np,
    )

    predictions = probabilities.argmax(
        axis=1
    )

    accuracy = float(
        (predictions == labels_np).mean()
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
        f"ECE: {ece:.6f}"
    )
    print(
        f"Brier score: {brier:.6f}"
    )
    print(
        f"NLL: {nll:.6f}"
    )

    return {
        "temperature": temperature,
        "accuracy": accuracy,
        "ece": ece,
        "brier": brier,
        "nll": nll,
    }


def main():

    set_seed()

    print(f"device: {DEVICE}")
    print(f"checkpoint: {CHECKPOINT}")

    if not CHECKPOINT.exists():
        raise FileNotFoundError(
            f"Missing checkpoint: {CHECKPOINT}"
        )

    checkpoint = torch.load(
        CHECKPOINT,
        map_location=DEVICE,
        weights_only=False,
    )

    model = build_e8_referable_resnet50(
        pretrained=False
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

    aptos_loader = (
        build_aptos_validation()
    )

    idrid_validation = (
        build_idrid_validation()
    )

    aptos_logits, aptos_labels = (
        collect_aptos_logits(
            model,
            aptos_loader,
        )
    )

    idrid_logits, idrid_labels = (
        collect_idrid_logits(
            model,
            idrid_validation,
        )
    )

    calibration_logits = torch.cat(
        [
            aptos_logits,
            idrid_logits,
        ]
    )

    calibration_labels = torch.cat(
        [
            aptos_labels,
            idrid_labels,
        ]
    )

    print()
    print("Calibration samples:")
    print(
        f"APTOS validation: "
        f"{len(aptos_labels)}"
    )
    print(
        f"IDRiD validation: "
        f"{len(idrid_labels)}"
    )
    print(
        f"Combined: "
        f"{len(calibration_labels)}"
    )

    temperature = fit_temperature(
        calibration_logits,
        calibration_labels,
    )

    evaluate_calibration(
        "E9 POOLED VALIDATION",
        calibration_logits,
        calibration_labels,
        temperature,
    )

    print()
    print("Calibration complete.")
    print(
        "Temperature was fitted using validation data only."
    )
    print(
        "No test data was used for calibration."
    )


if __name__ == "__main__":
    main()
