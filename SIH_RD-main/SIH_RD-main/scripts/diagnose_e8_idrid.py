"""
E8 IDRiD diagnostic.

Purpose:
- Evaluate the locked E8 referable-DR head on the official IDRiD test set.
- Break down false positives / false negatives by true DR grade.
- Inspect referable probabilities by true grade.
- Inspect lesion-head activations as diagnostic evidence.

IMPORTANT:
This script does NOT tune the test threshold or select a checkpoint.
The threshold comes from the checkpoint's validation metrics.
Lesion activations are exploratory evidence only, not validated clinical
lesion detection or causal explanations.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import csv
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
)

from training.datasets.idrid import IDRiDDataset
from training.models.e8_referable_resnet50 import (
    build_e8_referable_resnet50,
)
from training.preprocessing.transforms import build_eval_transform


CHECKPOINT = Path("checkpoints/e8_referable_epoch_004.pt")
IMAGE_SIZE = 384
DEVICE = torch.device(
    "mps"
    if torch.backends.mps.is_available()
    else "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

IDRID_TEST_IMAGE_DIR = Path(
    "data/idrid/B. Disease Grading/1. Original Images/b. Testing Set"
)

IDRID_SEGMENTATION_ROOT = Path(
    "data/idrid/_diagnostic_segmentation"
)

OUTPUT_CSV = Path(
    "experiments/e8_idrid_referable_diagnostic.csv"
)


def sigmoid(x: torch.Tensor) -> torch.Tensor:
    return torch.sigmoid(x)


def safe_metric(value: float) -> str:
    if np.isnan(value):
        return "nan"
    return f"{value:.6f}"


def screening_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float,
) -> dict[str, float]:

    y_pred = (y_prob >= threshold).astype(int)

    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    tn = int(((y_true == 0) & (y_pred == 0)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())

    sensitivity = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else float("nan")
    )

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else float("nan")
    )

    ppv = (
        tp / (tp + fp)
        if (tp + fp) > 0
        else float("nan")
    )

    npv = (
        tn / (tn + fn)
        if (tn + fn) > 0
        else float("nan")
    )

    f1 = (
        2 * ppv * sensitivity / (ppv + sensitivity)
        if (ppv + sensitivity) > 0
        else float("nan")
    )

    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "ppv": ppv,
        "npv": npv,
        "f1": f1,
    }


def main() -> None:

    print("=" * 70)
    print("E8 IDRiD REFERABLE-DR DIAGNOSTIC")
    print("=" * 70)

    print(f"Checkpoint : {CHECKPOINT}")
    print(f"Device     : {DEVICE}")

    if not CHECKPOINT.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {CHECKPOINT}"
        )

    checkpoint = torch.load(
        CHECKPOINT,
        map_location="cpu",
        weights_only=False,
    )

    validation_metrics = checkpoint.get(
        "validation_metrics",
        {},
    )

    referable_validation = validation_metrics.get(
        "referable_validation",
        {},
    )

    threshold = referable_validation.get(
        "threshold"
    )

    if threshold is None:
        raise RuntimeError(
            "Could not find validation referable threshold "
            "inside checkpoint['validation_metrics']."
        )

    print(
        f"Locked threshold from validation: "
        f"{threshold:.6f}"
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

    transform = build_eval_transform(
        image_size=IMAGE_SIZE
    )

    print("\nLoading official IDRiD test set...")

    image_files = sorted(
        path
        for path in IDRID_TEST_IMAGE_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
    )

    if not image_files:
        raise FileNotFoundError(
            f"No images found in:\n{IDRID_TEST_IMAGE_DIR}"
        )

    grading_csv = Path(
        "data/idrid/B. Disease Grading/2. Groundtruths/"
        "b. IDRiD_Disease Grading_Testing Labels.csv"
    )

    # The locked referable-DR evaluation uses the official 103-image
    # disease-grading test set. Lesion masks are exploratory auxiliary
    # evidence only and are loaded when available through the diagnostic
    # segmentation compatibility root.
    dataset = IDRiDDataset(
        image_paths=image_files,
        grading_csv=grading_csv,
        segmentation_root=IDRID_SEGMENTATION_ROOT,
        transform=transform,
    )

    print(f"Test images: {len(dataset)}")

    all_labels = []
    all_probs = []
    all_grades = []
    all_ids = []

    lesion_records = []

    with torch.no_grad():

        for index in range(len(dataset)):

            sample = dataset[index]

            image = sample["image"].unsqueeze(0).to(DEVICE)

            grade = int(sample["grade"])
            image_id = str(
                sample.get(
                    "image_id",
                    index,
                )
            )

            outputs = model.forward_e8(
                image
            )

            referable_probability = float(
                sigmoid(
                    outputs["referable_logits"]
                ).squeeze().item()
            )

            referable_label = int(
                referable_probability >= threshold
            )

            all_labels.append(
                int(grade >= 2)
            )

            all_probs.append(
                referable_probability
            )

            all_grades.append(grade)
            all_ids.append(image_id)

            lesion_values = {}

            lesion_logits = outputs.get(
                "lesion_logits"
            )

            if lesion_logits is not None:

                for lesion_name, lesion_logit in (
                    lesion_logits.items()
                ):

                    lesion_probability = float(
                        sigmoid(
                            lesion_logit
                        ).amax().item()
                    )

                    lesion_values[
                        lesion_name
                    ] = lesion_probability

            lesion_records.append(
                {
                    "image_id": image_id,
                    "true_grade": grade,
                    "referable_true": int(grade >= 2),
                    "referable_probability":
                        referable_probability,
                    "referable_prediction":
                        referable_label,
                    **lesion_values,
                }
            )

    y_true = np.asarray(
        all_labels,
        dtype=np.int64,
    )

    y_prob = np.asarray(
        all_probs,
        dtype=np.float64,
    )

    grades = np.asarray(
        all_grades,
        dtype=np.int64,
    )

    metrics = screening_metrics(
        y_true,
        y_prob,
        threshold,
    )

    roc_auc = roc_auc_score(
        y_true,
        y_prob,
    )

    pr_auc = average_precision_score(
        y_true,
        y_prob,
    )

    print("\n" + "=" * 70)
    print("OVERALL REFERABLE RESULTS")
    print("=" * 70)

    print(f"TP           : {metrics['tp']}")
    print(f"TN           : {metrics['tn']}")
    print(f"FP           : {metrics['fp']}")
    print(f"FN           : {metrics['fn']}")

    print(
        f"Sensitivity  : "
        f"{metrics['sensitivity'] * 100:.2f}%"
    )

    print(
        f"Specificity  : "
        f"{metrics['specificity'] * 100:.2f}%"
    )

    print(
        f"PPV          : "
        f"{metrics['ppv'] * 100:.2f}%"
    )

    print(
        f"NPV          : "
        f"{metrics['npv'] * 100:.2f}%"
    )

    print(
        f"F1           : "
        f"{metrics['f1']:.6f}"
    )

    print(
        f"ROC-AUC      : "
        f"{roc_auc:.6f}"
    )

    print(
        f"PR-AUC       : "
        f"{pr_auc:.6f}"
    )

    print("\n" + "=" * 70)
    print("FALSE POSITIVES / FALSE NEGATIVES BY TRUE GRADE")
    print("=" * 70)

    predictions = (
        y_prob >= threshold
    ).astype(int)

    for grade in range(5):

        mask = grades == grade

        if not mask.any():
            continue

        true_ref = (
            grade >= 2
        )

        predicted_ref = predictions[mask]

        fp = (
            int((predicted_ref == 1).sum())
            if not true_ref
            else 0
        )

        fn = (
            int((predicted_ref == 0).sum())
            if true_ref
            else 0
        )

        print(
            f"Grade {grade}: "
            f"n={int(mask.sum())}, "
            f"FP={fp}, "
            f"FN={fn}"
        )

    print("\n" + "=" * 70)
    print("REFERABLE PROBABILITY BY TRUE GRADE")
    print("=" * 70)

    for grade in range(5):

        mask = grades == grade

        if not mask.any():
            continue

        values = y_prob[mask]

        print(
            f"Grade {grade}: "
            f"n={len(values)}, "
            f"mean={values.mean():.4f}, "
            f"median={np.median(values):.4f}, "
            f"min={values.min():.4f}, "
            f"max={values.max():.4f}"
        )

    print("\n" + "=" * 70)
    print("LESION-HEAD DIAGNOSTIC EVIDENCE")
    print("=" * 70)

    lesion_names = [
        "ma",
        "he",
        "ex",
        "se",
    ]

    for group_name, group_mask in [
        (
            "TRUE NEGATIVE",
            (y_true == 0) & (predictions == 0),
        ),
        (
            "FALSE POSITIVE",
            (y_true == 0) & (predictions == 1),
        ),
        (
            "TRUE POSITIVE",
            (y_true == 1) & (predictions == 1),
        ),
        (
            "FALSE NEGATIVE",
            (y_true == 1) & (predictions == 0),
        ),
    ]:

        print(f"\n{group_name}")

        indices = np.where(
            group_mask
        )[0]

        print(
            f"Samples: {len(indices)}"
        )

        for lesion in lesion_names:

            values = [
                lesion_records[i].get(
                    lesion,
                    float("nan"),
                )
                for i in indices
            ]

            values = np.asarray(
                values,
                dtype=np.float64,
            )

            values = values[
                ~np.isnan(values)
            ]

            if len(values) == 0:
                print(
                    f"  {lesion}: unavailable"
                )
            else:
                print(
                    f"  {lesion}: "
                    f"mean={values.mean():.4f}, "
                    f"median={np.median(values):.4f}"
                )

    OUTPUT_CSV.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_CSV.open(
        "w",
        newline="",
    ) as file:

        fieldnames = [
            "image_id",
            "true_grade",
            "referable_true",
            "referable_probability",
            "referable_prediction",
            "ma",
            "he",
            "ex",
            "se",
        ]

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for record in lesion_records:
            writer.writerow(record)

    print("\n" + "=" * 70)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 70)

    print(
        f"Saved detailed CSV to:\n"
        f"{OUTPUT_CSV}"
    )

    print(
        "\nIMPORTANT:"
        "\nLesion-head values above are exploratory "
        "diagnostic evidence."
        "\nThey are NOT validated clinical lesion "
        "detection scores."
        "\nThey must not be presented as causal "
        "explanations."
    )


if __name__ == "__main__":
    main()