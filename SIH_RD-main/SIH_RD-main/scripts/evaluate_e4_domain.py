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
from torch.utils.data import DataLoader

from training.datasets.aptos import AptosDataset, load_aptos_records
from training.datasets.idrid import IDRiDDataset
from training.evaluation.metrics import compute_dr_metrics
from training.models.research_resnet50 import build_research_resnet50
from training.preprocessing.transforms import build_eval_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]

APTOS_ROOT = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
APTOS_MANIFEST = (
    PROJECT_ROOT
    / "data"
    / "aptos"
    / "aptos2019_split_manifest.csv"
)

IDRID_ROOT = PROJECT_ROOT / "data" / "idrid"
SEGMENTATION_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
)
DISEASE_ROOT = IDRID_ROOT / "B. Disease Grading"

IDRID_TEST_IMAGE_DIR = (
    DISEASE_ROOT
    / "1. Original Images"
    / "b. Testing Set"
)

IDRID_TEST_LABELS = (
    DISEASE_ROOT
    / "2. Groundtruths"
    / "b. IDRiD_Disease Grading_Testing Labels.csv"
)

CHECKPOINT = (
    PROJECT_ROOT
    / "checkpoints"
    / "e4_domain_epoch_005.pt"
)

IMAGE_SIZE = 384
BATCH_SIZE = 8

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)


def evaluate_arrays(name, y_true, y_prob):
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
    print(f"================ {name} ================")
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

    return {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "qwk": qwk,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
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
        build_eval_transform(image_size=IMAGE_SIZE),
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    y_true = []
    y_prob = []

    with torch.no_grad():
        for images, labels in loader:
            logits = model(images.to(DEVICE))
            probabilities = torch.softmax(
                logits,
                dim=1,
            )

            y_true.extend(labels.tolist())
            y_prob.append(
                probabilities.cpu().numpy()
            )

    return np.asarray(y_true), np.concatenate(y_prob)


def predict_idrid(model):
    image_paths = sorted(
        IDRID_TEST_IMAGE_DIR.glob("*")
    )

    dataset = IDRiDDataset(
        image_paths=image_paths,
        grading_csv=IDRID_TEST_LABELS,
        segmentation_root=SEGMENTATION_ROOT,
        transform=build_eval_transform(),
    )

    y_true = []
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

            y_true.append(int(sample["grade"]))
            y_prob.append(
                probabilities.squeeze(0)
                .cpu()
                .numpy()
            )

    return np.asarray(y_true), np.asarray(y_prob)


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
        f"E4 saved epoch: "
        f"{checkpoint.get('epoch')}"
    )

    # E4 retains the E3 model architecture:
    # shared ResNet-50 + MHSA + evidence branch + lesion heads.
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

    aptos_true, aptos_prob = predict_aptos(model)
    aptos_metrics = evaluate_arrays(
        "E4 APTOS LOCKED TEST",
        aptos_true,
        aptos_prob,
    )

    idrid_true, idrid_prob = predict_idrid(model)
    idrid_metrics = evaluate_arrays(
        "E4 IDRiD OFFICIAL TEST",
        idrid_true,
        idrid_prob,
    )

    print()
    print("================ E4 SUMMARY ================")
    print(
        f"APTOS: "
        f"accuracy={aptos_metrics['accuracy']:.6f}, "
        f"macro_f1={aptos_metrics['macro_f1']:.6f}, "
        f"QWK={aptos_metrics['qwk']:.6f}, "
        f"sensitivity={aptos_metrics['sensitivity']:.6f}, "
        f"specificity={aptos_metrics['specificity']:.6f}"
    )
    print(
        f"IDRiD: "
        f"accuracy={idrid_metrics['accuracy']:.6f}, "
        f"macro_f1={idrid_metrics['macro_f1']:.6f}, "
        f"QWK={idrid_metrics['qwk']:.6f}, "
        f"sensitivity={idrid_metrics['sensitivity']:.6f}, "
        f"specificity={idrid_metrics['specificity']:.6f}"
    )

    print()
    print("No training was performed.")
    print("No dataset split was changed.")
    print("APTOS uses the locked test partition.")
    print("IDRiD uses the official testing partition.")


if __name__ == "__main__":
    main()
