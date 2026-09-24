from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    cohen_kappa_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from torch.utils.data import DataLoader

from training.datasets.aptos import AptosDataset, load_aptos_records
from training.datasets.idrid import IDRiDDataset
from training.models import build_e8_referable_resnet50
from training.preprocessing import build_eval_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]

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

IDRID_SEGMENTATION_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
)

IDRID_DISEASE_ROOT = (
    IDRID_ROOT / "B. Disease Grading"
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

CHECKPOINT = (
    PROJECT_ROOT
    / "checkpoints"
    / "e9_full_referable_best.pt"
)

IMAGE_SIZE = 384
BATCH_SIZE = 8

DEVICE = torch.device(
    "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)


def print_multiclass_metrics(name, y_true, y_prob):
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    y_pred = y_prob.argmax(axis=1)

    accuracy = accuracy_score(y_true, y_pred)

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
    print("=" * 72)
    print(name)
    print("=" * 72)

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

    print("Confusion matrix:")
    print(
        confusion_matrix(
            y_true,
            y_pred,
            labels=[0, 1, 2, 3, 4],
        )
    )

    return {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "qwk": float(qwk),
    }


def print_direct_referable_metrics(
    name,
    y_true,
    referable_prob,
    threshold,
):
    y_true = np.asarray(y_true)
    referable_prob = np.asarray(referable_prob)

    actual = y_true >= 2
    predicted = referable_prob >= threshold

    tp = int(np.sum(actual & predicted))
    tn = int(np.sum(~actual & ~predicted))
    fp = int(np.sum(~actual & predicted))
    fn = int(np.sum(actual & ~predicted))

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

    precision = (
        tp / (tp + fp)
        if (tp + fp)
        else float("nan")
    )

    npv = (
        tn / (tn + fn)
        if (tn + fn)
        else float("nan")
    )

    f1 = f1_score(
        actual.astype(int),
        predicted.astype(int),
        zero_division=0,
    )

    try:
        roc_auc = roc_auc_score(
            actual.astype(int),
            referable_prob,
        )
    except ValueError:
        roc_auc = float("nan")

    try:
        pr_auc = average_precision_score(
            actual.astype(int),
            referable_prob,
        )
    except ValueError:
        pr_auc = float("nan")

    print()
    print("-" * 72)
    print(f"{name} — DIRECT REFERABLE HEAD")
    print("-" * 72)

    print(f"threshold: {threshold:.6f}")
    print("definition: grade >= 2")
    print()
    print(f"TP: {tp}")
    print(f"TN: {tn}")
    print(f"FP: {fp}")
    print(f"FN: {fn}")
    print()
    print(f"sensitivity: {sensitivity:.6f}")
    print(f"specificity: {specificity:.6f}")
    print(f"precision / PPV: {precision:.6f}")
    print(f"NPV: {npv:.6f}")
    print(f"F1: {f1:.6f}")
    print(f"ROC-AUC: {roc_auc:.6f}")
    print(f"PR-AUC: {pr_auc:.6f}")

    return {
        "threshold": float(threshold),
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "ppv": float(precision),
        "npv": float(npv),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
    }


def predict_aptos(model):
    records, failures = load_aptos_records(
        AptosConfig(
            APTOS_ROOT,
            APTOS_ROOT / "train.csv",
            APTOS_ROOT / "train_images",
            "id_code",
            "diagnosis",
            0.15,
            42,
        ),
        validate_images=False,
    )

    if failures:
        raise RuntimeError(
            f"Missing APTOS images: {failures[:5]}"
        )

    parts = load_aptos_manifest_records(
        APTOS_MANIFEST,
        records,
    )

    dataset = AptosDataset(
        parts["test"],
        build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    y_true = []
    y_prob = []
    y_ref_prob = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(DEVICE)

            outputs = model.forward_e8(images)

            dr_prob = torch.softmax(
                outputs["dr_logits"],
                dim=1,
            )

            ref_prob = torch.sigmoid(
                outputs["referable_logits"]
            )

            y_true.extend(
                labels.tolist()
            )

            y_prob.append(
                dr_prob.cpu().numpy()
            )

            y_ref_prob.append(
                ref_prob.cpu().numpy()
            )

    return (
        np.asarray(y_true),
        np.concatenate(y_prob),
        np.concatenate(y_ref_prob),
    )


def predict_idrid(model):
    image_paths = sorted(
        IDRID_TEST_IMAGE_DIR.glob("*")
    )

    dataset = IDRiDDataset(
        image_paths=image_paths,
        grading_csv=IDRID_TEST_LABELS,
        segmentation_root=IDRID_SEGMENTATION_ROOT,
        transform=build_eval_transform(
            image_size=IMAGE_SIZE
        ),
    )

    y_true = []
    y_prob = []
    y_ref_prob = []

    with torch.no_grad():
        for index in range(len(dataset)):
            sample = dataset[index]

            image = (
                sample["image"]
                .unsqueeze(0)
                .to(DEVICE)
            )

            outputs = model.forward_e8(image)

            dr_prob = torch.softmax(
                outputs["dr_logits"],
                dim=1,
            )

            ref_prob = torch.sigmoid(
                outputs["referable_logits"]
            )

            y_true.append(
                int(sample["grade"])
            )

            y_prob.append(
                dr_prob.squeeze(0)
                .cpu()
                .numpy()
            )

            y_ref_prob.append(
                float(ref_prob.item())
            )

    return (
        np.asarray(y_true),
        np.asarray(y_prob),
        np.asarray(y_ref_prob),
    )


def main():
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

    print(
        f"checkpoint epoch: "
        f"{checkpoint.get('epoch')}"
    )

    saved_metrics = checkpoint.get(
        "validation_metrics",
        {},
    )

    saved_threshold = (
        saved_metrics
        .get("pooled_validation_screening", {})
        .get("threshold")
    )

    if saved_threshold is None:
        raise RuntimeError(
            "Validation-selected referable "
            "threshold was not found in checkpoint."
        )

    threshold = float(saved_threshold)

    print(
        f"validation-selected threshold: "
        f"{threshold:.6f}"
    )

    print()
    print(
        "IMPORTANT: threshold comes from "
        "validation only."
    )
    print(
        "No test-set threshold optimization "
        "will be performed."
    )

    model = build_e8_referable_resnet50(
        pretrained=False,
    )

    missing, unexpected = model.load_state_dict(
        checkpoint["model_state"],
        strict=True,
    )

    if missing or unexpected:
        raise RuntimeError(
            f"Checkpoint mismatch. "
            f"missing={missing}, "
            f"unexpected={unexpected}"
        )

    model.to(DEVICE)
    model.eval()

    # ============================================================
    # APTOS LOCKED TEST
    # ============================================================

    print()
    print("Evaluating APTOS locked test...")

    (
        aptos_true,
        aptos_prob,
        aptos_ref_prob,
    ) = predict_aptos(model)

    aptos_grade_metrics = print_multiclass_metrics(
        "E9 APTOS LOCKED TEST — 5-CLASS DR",
        aptos_true,
        aptos_prob,
    )

    aptos_ref_metrics = print_direct_referable_metrics(
        "E9 APTOS LOCKED TEST",
        aptos_true,
        aptos_ref_prob,
        threshold,
    )

    # ============================================================
    # IDRiD OFFICIAL TEST
    # ============================================================

    print()
    print("Evaluating IDRiD official test...")

    (
        idrid_true,
        idrid_prob,
        idrid_ref_prob,
    ) = predict_idrid(model)

    idrid_grade_metrics = print_multiclass_metrics(
        "E9 IDRiD OFFICIAL TEST — 5-CLASS DR",
        idrid_true,
        idrid_prob,
    )

    idrid_ref_metrics = print_direct_referable_metrics(
        "E9 IDRiD OFFICIAL TEST",
        idrid_true,
        idrid_ref_prob,
        threshold,
    )

    # ============================================================
    # FINAL SUMMARY
    # ============================================================

    print()
    print("=" * 72)
    print("E9 LOCKED TEST SUMMARY")
    print("=" * 72)

    print(
        f"APTOS | "
        f"Accuracy={aptos_grade_metrics['accuracy']:.4f} | "
        f"Macro-F1={aptos_grade_metrics['macro_f1']:.4f} | "
        f"QWK={aptos_grade_metrics['qwk']:.4f} | "
        f"Ref Sens={aptos_ref_metrics['sensitivity']:.4f} | "
        f"Ref Spec={aptos_ref_metrics['specificity']:.4f}"
    )

    print(
        f"IDRiD | "
        f"Accuracy={idrid_grade_metrics['accuracy']:.4f} | "
        f"Macro-F1={idrid_grade_metrics['macro_f1']:.4f} | "
        f"QWK={idrid_grade_metrics['qwk']:.4f} | "
        f"Ref Sens={idrid_ref_metrics['sensitivity']:.4f} | "
        f"Ref Spec={idrid_ref_metrics['specificity']:.4f}"
    )

    print()
    print("Evaluation completed.")
    print("No training was performed.")
    print("No dataset split was changed.")
    print("No test-set threshold tuning was performed.")
    print("APTOS uses the locked test partition.")
    print("IDRiD uses the official testing partition.")


if __name__ == "__main__":
    main()
