from pathlib import Path
import numpy as np
import torch

from scripts.evaluate_e7_reliability import (
    set_seed,
    load_model,
    build_aptos_split,
    build_idrid_split,
    infer_loader,
    infer_idrid,
    BATCH_SIZE,
    TEMPERATURE,
    DEVICE,
)
from torch.utils.data import DataLoader


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def aptos_collate(batch):
    return {
        "image": torch.stack([x["image"] for x in batch]),
        "grade": torch.tensor(
            [x["grade"] for x in batch],
            dtype=torch.long,
        ),
    }


def evaluate_threshold(name, probabilities, labels, threshold):
    referable_probability = probabilities[:, 2:].sum(axis=1)
    predicted = referable_probability >= threshold
    actual = labels >= 2

    tp = np.sum(actual & predicted)
    fn = np.sum(actual & ~predicted)
    tn = np.sum(~actual & ~predicted)
    fp = np.sum(~actual & predicted)

    sensitivity = tp / (tp + fn) if tp + fn else np.nan
    specificity = tn / (tn + fp) if tn + fp else np.nan

    return {
        "name": name,
        "threshold": threshold,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "tp": int(tp),
        "fn": int(fn),
        "tn": int(tn),
        "fp": int(fp),
    }


def print_result(r):
    print(
        f"T={r['threshold']:.4f} | "
        f"Sens={r['sensitivity']*100:.2f}% | "
        f"Spec={r['specificity']*100:.2f}% | "
        f"TP={r['tp']} FN={r['fn']} "
        f"TN={r['tn']} FP={r['fp']}"
    )


def main():
    set_seed()

    print(f"device: {DEVICE}")
    print(f"temperature: {TEMPERATURE}")

    model = load_model()

    # ==========================================================
    # VALIDATION DATA
    # ==========================================================

    aptos_val = build_aptos_split("validation")

    aptos_val_loader = DataLoader(
        aptos_val,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=aptos_collate,
    )

    aptos_probs, _, aptos_labels = infer_loader(
        model,
        aptos_val_loader,
    )

    idrid_val = build_idrid_split("validation")

    idrid_probs, _, idrid_labels = infer_idrid(
        model,
        idrid_val,
    )

    pooled_probs = np.concatenate(
        [aptos_probs, idrid_probs]
    )

    pooled_labels = np.concatenate(
        [aptos_labels, idrid_labels]
    )

    # ==========================================================
    # THRESHOLD SWEEP
    # ==========================================================

    thresholds = np.linspace(
        0.05,
        0.95,
        901,
    )

    results = []

    for threshold in thresholds:
        result = evaluate_threshold(
            "pooled_validation",
            pooled_probs,
            pooled_labels,
            threshold,
        )

        # SIH protocol target:
        # specificity >= 85%
        if result["specificity"] >= 0.85:
            results.append(result)

    if not results:
        raise RuntimeError(
            "No validation threshold reached "
            "85% specificity."
        )

    # Among thresholds satisfying the SIH
    # specificity constraint, maximize sensitivity.
    #
    # If several thresholds have the same
    # sensitivity, choose the one with
    # higher specificity.
    best = max(
        results,
        key=lambda r: (
            r["sensitivity"],
            r["specificity"],
            -r["threshold"],
        ),
    )

    print()
    print(
        "================================================"
    )
    print(
        "REFERABLE DR THRESHOLD OPTIMIZATION"
    )
    print(
        "================================================"
    )

    print(
        "Target constraint: specificity >= 85%"
    )

    print()
    print(
        "BEST VALIDATION OPERATING POINT"
    )

    print_result(best)

    # Also report the highest-sensitivity point
    # around the clinically interesting region.
    print()
    print(
        "TOP VALIDATION OPERATING POINTS"
    )

    ranked = sorted(
        results,
        key=lambda r: (
            -r["sensitivity"],
            -r["specificity"],
        ),
    )

    for result in ranked[:10]:
        print_result(result)

    threshold = best["threshold"]

    # ==========================================================
    # LOCKED APTOS TEST
    # ==========================================================

    aptos_test = build_aptos_split("test")

    aptos_test_loader = DataLoader(
        aptos_test,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        collate_fn=aptos_collate,
    )

    aptos_test_probs, _, aptos_test_labels = infer_loader(
        model,
        aptos_test_loader,
    )

    aptos_result = evaluate_threshold(
        "APTOS LOCKED TEST",
        aptos_test_probs,
        aptos_test_labels,
        threshold,
    )

    print()
    print(
        "================================================"
    )
    print(
        "LOCKED TEST RESULTS"
    )
    print(
        "================================================"
    )

    print()
    print("APTOS LOCKED TEST")
    print_result(aptos_result)

    # ==========================================================
    # OFFICIAL IDRiD TEST
    # ==========================================================

    idrid_test = build_idrid_split("test")

    idrid_test_probs, _, idrid_test_labels = infer_idrid(
        model,
        idrid_test,
    )

    idrid_result = evaluate_threshold(
        "IDRiD OFFICIAL TEST",
        idrid_test_probs,
        idrid_test_labels,
        threshold,
    )

    print()
    print("IDRiD OFFICIAL TEST")
    print_result(idrid_result)

    print()
    print(
        "================================================"
    )
    print(
        "INTERPRETATION"
    )
    print(
        "================================================"
    )

    print(
        f"Validation-selected threshold: "
        f"{threshold:.4f}"
    )

    print(
        "Threshold was selected using validation data only."
    )

    print(
        "APTOS and IDRiD test sets were not used "
        "for threshold selection."
    )

    print(
        "No model weights were changed."
    )

    print(
        "No retraining was performed."
    )


if __name__ == "__main__":
    main()
