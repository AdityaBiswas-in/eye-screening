from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    cohen_kappa_score,
    roc_auc_score,
    average_precision_score,
)

from training.datasets.idrid import IDRiDDataset
from training.models.research_resnet50 import build_research_resnet50
from training.preprocessing.transforms import build_eval_transform


PROJECT_ROOT = Path(__file__).resolve().parents[1]

IDRID_ROOT = PROJECT_ROOT / "data" / "idrid"
SEGMENTATION_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
)
DISEASE_ROOT = IDRID_ROOT / "B. Disease Grading"

TEST_IMAGE_DIR = (
    DISEASE_ROOT
    / "1. Original Images"
    / "b. Testing Set"
)

TEST_LABELS = (
    DISEASE_ROOT
    / "2. Groundtruths"
    / "b. IDRiD_Disease Grading_Testing Labels.csv"
)

CHECKPOINT = PROJECT_ROOT / "checkpoints" / "e3_resnet50_best.pt"

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

IMAGE_SIZE = 384


def main():
    print(f"device: {DEVICE}")
    print(f"checkpoint: {CHECKPOINT}")

    if not CHECKPOINT.exists():
        raise FileNotFoundError(
            f"Missing checkpoint: {CHECKPOINT}"
        )

    image_paths = sorted(TEST_IMAGE_DIR.glob("*"))

    dataset = IDRiDDataset(
        image_paths=image_paths,
        grading_csv=TEST_LABELS,
        segmentation_root=SEGMENTATION_ROOT,
        transform=build_eval_transform(),
    )

    print(f"IDRiD official test images: {len(dataset)}")

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

    y_true = []
    y_pred = []
    y_prob = []

    with torch.no_grad():
        for index in range(len(dataset)):
            sample = dataset[index]

            image = sample["image"].unsqueeze(0).to(DEVICE)

            output = model.forward_e3(image)
            logits = output["dr_logits"]

            probabilities = torch.softmax(
                logits,
                dim=1,
            )

            prediction = int(
                probabilities.argmax(dim=1).item()
            )

            y_true.append(int(sample["grade"]))
            y_pred.append(prediction)
            y_prob.append(
                probabilities
                .squeeze(0)
                .cpu()
                .numpy()
            )

    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    y_prob = np.asarray(y_prob)

    accuracy = accuracy_score(
        y_true,
        y_pred,
    )

    macro_f1 = f1_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    qwk = cohen_kappa_score(
        y_true,
        y_pred,
        weights="quadratic",
    )

    print()
    print("=== E3 IDRiD OFFICIAL TEST ===")
    print(f"accuracy: {accuracy:.6f}")
    print(f"macro F1: {macro_f1:.6f}")
    print(f"QWK: {qwk:.6f}")

    print()
    print("Per-class metrics:")

    print(
        classification_report(
            y_true,
            y_pred,
            labels=[0, 1, 2, 3, 4],
            digits=6,
            zero_division=0,
        )
    )

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=[0, 1, 2, 3, 4],
    )

    print("Confusion matrix:")
    print(cm)

    # Referable DR protocol:
    # grade >= 2
    y_true_ref = (y_true >= 2).astype(int)
    y_pred_ref = (y_pred >= 2).astype(int)

    tp = int(
        ((y_true_ref == 1) & (y_pred_ref == 1)).sum()
    )

    tn = int(
        ((y_true_ref == 0) & (y_pred_ref == 0)).sum()
    )

    fp = int(
        ((y_true_ref == 0) & (y_pred_ref == 1)).sum()
    )

    fn = int(
        ((y_true_ref == 1) & (y_pred_ref == 0)).sum()
    )

    sensitivity = (
        tp / (tp + fn)
        if (tp + fn)
        else float("nan")
    )

    specificity = (
        tn / (tn + fp)
        if (tn + fp)
        else float("nan")
    )

    # Probability of referable DR.
    ref_prob = y_prob[:, 2:].sum(axis=1)

    try:
        roc_auc = roc_auc_score(
            y_true_ref,
            ref_prob,
        )
    except ValueError:
        roc_auc = float("nan")

    try:
        pr_auc = average_precision_score(
            y_true_ref,
            ref_prob,
        )
    except ValueError:
        pr_auc = float("nan")

    print()
    print("Referable DR")
    print("definition: grade >= 2")
    print(f"sensitivity: {sensitivity:.6f}")
    print(f"specificity: {specificity:.6f}")
    print(f"ROC-AUC: {roc_auc:.6f}")
    print(f"PR-AUC: {pr_auc:.6f}")

    print()
    print("Checkpoint metadata:")
    print(f"saved epoch: {checkpoint.get('epoch')}")
    print(
        f"validation metrics: "
        f"{checkpoint.get('validation_metrics')}"
    )


if __name__ == "__main__":
    main()
