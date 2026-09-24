"""Evaluation metrics for five-class DR grading and provisional referral triage."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    roc_auc_score,
)


def compute_dr_metrics(labels: list[int], probabilities: np.ndarray) -> dict[str, object]:
    """Compute grading and grade>=2 referral metrics from class probabilities."""

    if probabilities.ndim != 2 or probabilities.shape[1] != 5:
        raise ValueError("probabilities must have shape [n_samples, 5].")
    if len(labels) != probabilities.shape[0] or len(labels) == 0:
        raise ValueError("labels must be non-empty and match probability rows.")
    true = np.asarray(labels, dtype=int)
    if np.any((true < 0) | (true > 4)):
        raise ValueError("DR labels must be in [0, 4].")
    predicted = probabilities.argmax(axis=1)
    precision, recall, f1, support = precision_recall_fscore_support(
        true, predicted, labels=list(range(5)), zero_division=0
    )
    referable_true = (true >= 2).astype(int)
    referable_score = probabilities[:, 2:].sum(axis=1)
    referable_predicted = (predicted >= 2).astype(int)
    tn, fp, fn, tp = confusion_matrix(referable_true, referable_predicted, labels=[0, 1]).ravel()
    metrics: dict[str, object] = {
        "accuracy": float(accuracy_score(true, predicted)),
        "macro_f1": float(f1_score(true, predicted, average="macro", zero_division=0)),
        "per_class": {
            str(grade): {"precision": float(precision[grade]), "recall": float(recall[grade]), "f1": float(f1[grade]), "support": int(support[grade])}
            for grade in range(5)
        },
        "confusion_matrix": confusion_matrix(true, predicted, labels=list(range(5))).tolist(),
        "quadratic_weighted_kappa": float(cohen_kappa_score(true, predicted, weights="quadratic")),
        "referable_dr": {
            "definition": "grade >= 2",
            "sensitivity": float(tp / (tp + fn)) if tp + fn else 0.0,
            "specificity": float(tn / (tn + fp)) if tn + fp else 0.0,
            "roc_auc": float(roc_auc_score(referable_true, referable_score)),
            "pr_auc": float(average_precision_score(referable_true, referable_score)),
        },
    }
    return metrics
