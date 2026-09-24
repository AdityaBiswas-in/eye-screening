from pathlib import Path
import random

import numpy as np
import pandas as pd
import torch

from training.datasets.aptos import AptosDataset, load_aptos_records
from training.datasets.idrid import IDRiDDataset
from training.models.e8_referable_resnet50 import (
    build_e8_referable_resnet50,
)
from training.preprocessing.transforms import build_eval_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SEED = 42
IMAGE_SIZE = 384
NUM_CLASSES = 5
TEMPERATURE = 2.069366
CONFORMAL_THRESHOLD = 0.812996

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

CHECKPOINT = (
    PROJECT_ROOT
    / "checkpoints"
    / "e9_full_referable_best.pt"
)

APTOS_ROOT = (
    PROJECT_ROOT / "data" / "aptos" / "aptos2019"
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

LESION_TYPES = ("ma", "he", "ex", "se")


def set_seed():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)


class AptosWrapper(torch.utils.data.Dataset):
    def __init__(self, dataset):
        self.dataset = dataset

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, index):
        image, grade = self.dataset[index]
        return {"image": image, "grade": grade}


def build_aptos_split(split):
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

    return AptosWrapper(
        AptosDataset(
            manifest[split],
            build_eval_transform(image_size=IMAGE_SIZE),
        )
    )


def build_idrid_split(split):
    if split == "validation":
        image_dir = IDRID_TRAIN_IMAGE_DIR
        labels_path = IDRID_TRAIN_LABELS
        seg_dir = (
            IDRID_SEGMENTATION_ROOT
            / "a. Training Set"
        )

        image_paths = sorted(
            image_dir.glob("*.jpg")
        )

        df = pd.read_csv(labels_path)

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
                int(label), []
            ).append(index)

        val_indices = []

        for label in sorted(by_class):
            indices = by_class[label][:]
            rng.shuffle(indices)

            cut = max(
                1,
                int(round(len(indices) * 0.80)),
            )

            val_indices.extend(indices[cut:])

        image_paths = [
            image_paths[i]
            for i in sorted(val_indices)
        ]

    else:
        image_paths = sorted(
            IDRID_TEST_IMAGE_DIR.glob("*.jpg")
        )
        labels_path = IDRID_TEST_LABELS
        seg_dir = (
            IDRID_SEGMENTATION_ROOT
            / "b. Testing Set"
        )

    return IDRiDDataset(
        image_paths=image_paths,
        grading_csv=labels_path,
        segmentation_root=seg_dir,
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )


def load_model():
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

    return model, checkpoint


def lesion_evidence(output):
    scores = []

    for lesion in LESION_TYPES:
        lesion_prob = torch.sigmoid(
            output[f"{lesion}_logits"]
        )

        flat = lesion_prob.flatten(
            start_dim=1
        )

        k = max(
            1,
            int(flat.shape[1] * 0.005),
        )

        scores.append(
            torch.topk(
                flat,
                k=k,
                dim=1,
            ).values.mean(dim=1)
        )

    return torch.stack(scores, dim=1).max(dim=1).values


def infer_dataset(model, dataset):
    probabilities = []
    evidence = []
    labels = []

    for index in range(len(dataset)):
        sample = dataset[index]

        image = (
            sample["image"]
            .unsqueeze(0)
            .to(DEVICE)
        )

        with torch.no_grad():
            output = model.forward_e8(image)

            probs = torch.softmax(
                output["dr_logits"] / TEMPERATURE,
                dim=1,
            )

            evidence_score = lesion_evidence(
                output
            )

        probabilities.append(
            probs.squeeze(0).cpu().numpy()
        )
        evidence.append(
            float(evidence_score.item())
        )
        labels.append(int(sample["grade"]))

    return (
        np.asarray(probabilities),
        np.asarray(evidence),
        np.asarray(labels),
    )


def prediction_sets(probabilities):
    sets = []

    cutoff = 1.0 - CONFORMAL_THRESHOLD

    for row in probabilities:
        selected = [
            grade
            for grade in range(NUM_CLASSES)
            if row[grade] >= cutoff
        ]

        if not selected:
            selected = [int(np.argmax(row))]

        sets.append(selected)

    return sets


def fit_evidence_threshold(
    probabilities,
    evidence,
):
    predictions = probabilities.argmax(axis=1)
    sets = prediction_sets(probabilities)

    eligible = []

    for pred, prediction_set, score in zip(
        predictions,
        sets,
        evidence,
    ):
        if (
            pred >= 2
            and len(prediction_set) == 1
        ):
            eligible.append(float(score))

    if not eligible:
        raise RuntimeError(
            "No eligible validation cases "
            "for E7 evidence threshold."
        )

    threshold = float(
        np.quantile(
            np.asarray(eligible),
            0.10,
        )
    )

    return threshold, len(eligible)


def evaluate(
    name,
    probabilities,
    evidence,
    labels,
    evidence_threshold,
):
    predictions = probabilities.argmax(axis=1)
    sets = prediction_sets(probabilities)

    review_uncertainty = np.asarray(
        [len(s) > 1 for s in sets]
    )

    review_evidence = np.asarray(
        [
            pred >= 2 and score < evidence_threshold
            for pred, score in zip(
                predictions,
                evidence,
            )
        ]
    )

    review = (
        review_uncertainty
        | review_evidence
    )

    accepted = ~review

    coverage = float(
        np.mean(
            [
                int(label) in prediction_set
                for label, prediction_set in zip(
                    labels,
                    sets,
                )
            ]
        )
    )

    review_rate = float(np.mean(review))
    acceptance_rate = float(np.mean(accepted))

    accepted_correct = (
        predictions[accepted]
        == labels[accepted]
    )

    accepted_accuracy = (
        float(np.mean(accepted_correct))
        if np.any(accepted)
        else float("nan")
    )

    print(
        f"\n================ E7 {name} ================"
    )
    print(
        f"evidence threshold: {evidence_threshold:.6f}"
    )
    print(
        f"conformal threshold: {CONFORMAL_THRESHOLD:.6f}"
    )
    print(
        f"conformal coverage: {coverage:.6f}"
    )
    print(
        f"review rate: {review_rate:.6f}"
    )
    print(
        f"acceptance rate: {acceptance_rate:.6f}"
    )
    print(
        f"accepted accuracy: {accepted_accuracy:.6f}"
    )
    print(
        f"uncertainty reviews: "
        f"{int(review_uncertainty.sum())}"
    )
    print(
        f"evidence reviews: "
        f"{int(review_evidence.sum())}"
    )
    print(
        f"total reviews: {int(review.sum())}"
    )
    print(
        f"accepted cases: {int(accepted.sum())}"
    )

    return {
        "name": name,
        "evidence_threshold": evidence_threshold,
        "conformal_threshold": CONFORMAL_THRESHOLD,
        "coverage": coverage,
        "review_rate": review_rate,
        "acceptance_rate": acceptance_rate,
        "accepted_accuracy": accepted_accuracy,
        "uncertainty_reviews": int(
            review_uncertainty.sum()
        ),
        "evidence_reviews": int(
            review_evidence.sum()
        ),
        "total_reviews": int(review.sum()),
        "accepted_cases": int(accepted.sum()),
    }


def main():
    set_seed()

    model, checkpoint = load_model()

    print(f"device: {DEVICE}")
    print(f"checkpoint: {CHECKPOINT}")
    print(
        "E9 checkpoint epoch:",
        checkpoint.get("epoch"),
    )
    print(
        "E9 calibration temperature:",
        TEMPERATURE,
    )
    print(
        "E9 conformal threshold:",
        CONFORMAL_THRESHOLD,
    )

    aptos_validation = build_aptos_split(
        "validation"
    )

    idrid_validation = build_idrid_split(
        "validation"
    )

    print("\nE7 validation data:")
    print(
        "APTOS validation:",
        len(aptos_validation),
    )
    print(
        "IDRiD validation:",
        len(idrid_validation),
    )

    aptos_val_probs, aptos_val_evidence, aptos_val_labels = (
        infer_dataset(
            model,
            aptos_validation,
        )
    )

    idrid_val_probs, idrid_val_evidence, idrid_val_labels = (
        infer_dataset(
            model,
            idrid_validation,
        )
    )

    pooled_probs = np.concatenate(
        [aptos_val_probs, idrid_val_probs]
    )

    pooled_evidence = np.concatenate(
        [aptos_val_evidence, idrid_val_evidence]
    )

    pooled_labels = np.concatenate(
        [aptos_val_labels, idrid_val_labels]
    )

    evidence_threshold, eligible_count = (
        fit_evidence_threshold(
            pooled_probs,
            pooled_evidence,
        )
    )

    print(
        "\n================ E7 EVIDENCE CALIBRATION ================"
    )
    print(
        f"eligible confident referable validation cases: "
        f"{eligible_count}"
    )
    print(
        f"E7 evidence threshold: "
        f"{evidence_threshold:.6f}"
    )
    print(
        "threshold source: pooled E9 validation only"
    )
    print(
        "quantile: 0.10"
    )

    evaluate(
        "POOLED VALIDATION",
        pooled_probs,
        pooled_evidence,
        pooled_labels,
        evidence_threshold,
    )

    aptos_test = build_aptos_split("test")
    idrid_test = build_idrid_split("test")

    aptos_test_probs, aptos_test_evidence, aptos_test_labels = (
        infer_dataset(
            model,
            aptos_test,
        )
    )

    idrid_test_probs, idrid_test_evidence, idrid_test_labels = (
        infer_dataset(
            model,
            idrid_test,
        )
    )

    evaluate(
        "APTOS LOCKED TEST",
        aptos_test_probs,
        aptos_test_evidence,
        aptos_test_labels,
        evidence_threshold,
    )

    evaluate(
        "IDRiD OFFICIAL TEST",
        idrid_test_probs,
        idrid_test_evidence,
        idrid_test_labels,
        evidence_threshold,
    )

    print(
        "\nE7 E9 reliability calibration completed."
    )
    print(
        "No retraining was performed."
    )
    print(
        "E9 model weights remained frozen."
    )
    print(
        f"E9 temperature remained fixed at {TEMPERATURE:.6f}."
    )
    print(
        f"Conformal threshold remained fixed at "
        f"{CONFORMAL_THRESHOLD:.6f}."
    )
    print(
        "Evidence threshold was fitted using "
        "pooled validation predictions only."
    )
    print(
        "APTOS and IDRiD official test sets were "
        "not used to fit the evidence threshold."
    )


if __name__ == "__main__":
    main()
