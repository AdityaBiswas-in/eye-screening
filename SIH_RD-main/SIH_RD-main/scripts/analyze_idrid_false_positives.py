from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader

from scripts.evaluate_e7_reliability import (
    set_seed,
    load_model,
    build_idrid_split,
    infer_idrid,
    TEMPERATURE,
)

def main():
    set_seed()

    model = load_model()
    dataset = build_idrid_split("test")

    probs, _, labels = infer_idrid(model, dataset)

    probs = np.asarray(probs)
    labels = np.asarray(labels)

    referable_probability = probs[:, 2:].sum(axis=1)
    threshold = 0.2390

    predicted_grade = probs.argmax(axis=1)
    predicted_ref = referable_probability >= threshold
    actual_ref = labels >= 2

    false_positive = (~actual_ref) & predicted_ref

    print("\n==============================================")
    print("IDRiD FALSE-POSITIVE DIAGNOSTIC")
    print("==============================================")
    print(f"Threshold: {threshold:.4f}")
    print(f"Temperature: {TEMPERATURE}")
    print(f"Total samples: {len(labels)}")
    print(f"False positives: {false_positive.sum()}")
    print()

    print("FALSE POSITIVES BY TRUE GRADE")
    print("----------------------------------------------")

    for grade in range(5):
        mask = false_positive & (labels == grade)
        print(
            f"True grade {grade}: "
            f"{mask.sum()}"
        )

    print()
    print("FALSE POSITIVES BY TRUE → PREDICTED GRADE")
    print("----------------------------------------------")

    for true_grade in [0, 1]:
        for pred_grade in [2, 3, 4]:
            mask = (
                false_positive
                & (labels == true_grade)
                & (predicted_grade == pred_grade)
            )

            print(
                f"{true_grade} → {pred_grade}: "
                f"{mask.sum()}"
            )

    print()
    print("ALL IDRiD TEST CONFUSION MATRIX")
    print("----------------------------------------------")

    matrix = np.zeros((5, 5), dtype=int)

    for true_grade, pred_grade in zip(
        labels,
        predicted_grade,
    ):
        matrix[int(true_grade), int(pred_grade)] += 1

    print(matrix)

    print()
    print("REFERABLE PROBABILITY BY TRUE GRADE")
    print("----------------------------------------------")

    for grade in range(5):
        mask = labels == grade

        values = referable_probability[mask]

        print(
            f"Grade {grade}: "
            f"n={len(values)}, "
            f"mean={values.mean():.4f}, "
            f"median={np.median(values):.4f}, "
            f"min={values.min():.4f}, "
            f"max={values.max():.4f}"
        )

    print()
    print("NON-REFERABLE THRESHOLD PRESSURE")
    print("----------------------------------------------")

    for threshold in [0.20, 0.239, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]:
        predicted = referable_probability >= threshold

        tp = np.sum(actual_ref & predicted)
        fn = np.sum(actual_ref & ~predicted)
        tn = np.sum(~actual_ref & ~predicted)
        fp = np.sum(~actual_ref & predicted)

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

        print(
            f"T={threshold:.3f} | "
            f"Sens={sensitivity*100:.2f}% | "
            f"Spec={specificity*100:.2f}% | "
            f"FP={fp} | FN={fn}"
        )

if __name__ == "__main__":
    main()
