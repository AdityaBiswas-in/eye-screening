"""Evidence-grade consistency evaluation for SIH-26038 (EXPERIMENTAL).

Tests whether lesion activation scores (from E9 experimental lesion heads)
are consistent with the predicted DR grade.

MOTIVATION:
  Higher DR grade should, in general, correspond to greater lesion burden.
  This is not always true for individual images, but as a statistical trend
  it provides a sanity check for the evidence reliability mechanism.

METHOD:
  Spearman rank correlation between:
    - DR grade (0–4)
    - Lesion activation score for each lesion type (MA, HE, EX, SE)

  Spearman (not Pearson) is used because:
    - DR grades are ordinal (0-4), not interval
    - Lesion activations may not be linearly related to grade
    - Spearman is robust to monotone transformations

NOT CLAIMED:
  - That this is clinical validation of the lesion heads.
  - That high activation equals lesion presence.
  - That this replaces a dedicated lesion segmentation evaluation.

IMPORTANT LIMITATIONS:
  - E9 lesion heads are experimental — they were not trained exclusively
    for lesion detection with per-pixel supervision.
  - Activation maps are mean sigmoid activations, not calibrated probabilities.
  - Correlation does not establish causation or clinical reliability.

STATUS: EXPERIMENTAL / NOT CLINICALLY VALIDATED
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np


def _spearman_correlation(x: List[float], y: List[float]) -> Optional[float]:
    """Compute Spearman rank correlation between two lists."""
    if len(x) < 3 or len(y) < 3:
        return None  # Not enough data

    n = len(x)

    def _rank(lst):
        """Return rank array (1-based average ranks for ties)."""
        arr = np.asarray(lst, dtype=np.float64)
        order = np.argsort(arr)
        ranks = np.empty(n, dtype=np.float64)
        i = 0
        while i < n:
            j = i + 1
            while j < n and arr[order[j]] == arr[order[i]]:
                j += 1
            avg_rank = (i + j + 1) / 2.0
            for k in range(i, j):
                ranks[order[k]] = avg_rank
            i = j
        return ranks

    rx = _rank(x)
    ry = _rank(y)
    rx_centered = rx - rx.mean()
    ry_centered = ry - ry.mean()
    denom = np.sqrt(np.sum(rx_centered**2) * np.sum(ry_centered**2))
    if denom < 1e-12:
        return None
    return float(np.sum(rx_centered * ry_centered) / denom)


def evaluate_evidence_grade_consistency(
    grades: List[int],
    lesion_activations: Dict[str, List[float]],
) -> Dict[str, Any]:
    """Compute Spearman correlation between DR grade and lesion activations.

    Parameters
    ----------
    grades : list of DR grades (int, 0–4), one per image
    lesion_activations : dict mapping lesion_type -> list of activation values,
        e.g. {"ma": [0.1, 0.3, ...], "he": [...], ...}
        Each list must have the same length as `grades`.

    Returns
    -------
    Dict with Spearman ρ for each lesion type and interpretation.
    """
    if len(grades) < 3:
        return {
            "status": "insufficient_data",
            "message": f"At least 3 samples required; got {len(grades)}.",
        }

    results = {}
    for lesion_type, activations in lesion_activations.items():
        if len(activations) != len(grades):
            results[lesion_type] = {
                "spearman_rho": None,
                "error": f"Length mismatch: grades={len(grades)}, activations={len(activations)}",
            }
            continue

        rho = _spearman_correlation(grades, activations)
        results[lesion_type] = {
            "spearman_rho": rho,
            "n_samples": len(grades),
            "interpretation": (
                f"Spearman ρ = {rho:.3f}" if rho is not None else "undefined"
            ) + (
                ". Positive ρ suggests higher-grade images tend to have higher activation. "
                "This is a research sanity check, not clinical validation."
            ),
        }

    return {
        "method": "spearman_rank_correlation",
        "metric_rationale": (
            "Spearman rank correlation is used because DR grades are ordinal (0–4) "
            "and lesion activations may not be linearly related to grade. "
            "Pearson correlation is not appropriate for ordinal inputs."
        ),
        "per_lesion": results,
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
        "note": (
            "This measures statistical tendency only. It does NOT validate "
            "the E9 lesion heads as clinical lesion detectors. "
            "High Spearman ρ is consistent with but does not prove "
            "lesion-grade concordance."
        ),
    }
