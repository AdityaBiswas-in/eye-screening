"""Explanation fidelity evaluation for SIH-26038 (EXPERIMENTAL).

Measures whether the Grad-CAM attribution map corresponds to the model's
actual decision by testing how the model confidence changes when attributed
regions are masked or revealed.

METHODS IMPLEMENTED:
  1. Deletion test: Start with the full image. Progressively mask top-K%
     of highest-attribution pixels with the image mean. Measure how
     confidence in the predicted class drops.
     Interpretation: Faster drop = more faithful attribution.

  2. Insertion test: Start with a blurred/mean image. Progressively reveal
     top-K% of highest-attribution pixels from the original. Measure how
     confidence rises.
     Interpretation: Faster rise = more faithful attribution.

REPORTED METRICS:
  - confidence_at_K: confidence at each masking step K
  - auc_deletion: area under deletion curve (lower = more faithful)
  - auc_insertion: area under insertion curve (higher = more faithful)
  - delta_at_50pct: confidence change when 50% of pixels are masked/revealed

NOT REPORTED (and why):
  - A single "fidelity score": A single scalar obscures the curve shape.
  - Clinical sensitivity/specificity: This is not classification evaluation.

IMPORTANT:
  These are research methods. They measure attribution faithfulness to the
  model's decision, NOT clinical reliability of the explanation.

STATUS: EXPERIMENTAL / NOT CLINICALLY VALIDATED
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np


def _get_sorted_pixel_indices(
    heatmap: np.ndarray, descending: bool = True
) -> np.ndarray:
    """Return flat pixel indices sorted by attribution value."""
    flat = heatmap.flatten()
    indices = np.argsort(flat)
    if descending:
        indices = indices[::-1]
    return indices


def deletion_test(
    image_array: np.ndarray,
    heatmap: np.ndarray,
    model_fn,
    steps: Optional[List[float]] = None,
    fill_value: Optional[float] = None,
) -> Dict[str, Any]:
    """Run the deletion fidelity test.

    Parameters
    ----------
    image_array : np.ndarray, shape (H, W, 3), float32 in [0, 1]
    heatmap : np.ndarray, shape (H, W), float32 in [0, 1]
    model_fn : callable(image_array) -> float (confidence for predicted class)
    steps : list of mask fractions (default: [0, 0.1, 0.2, ..., 1.0])
    fill_value : pixel fill value (default: mean of image_array)

    Returns
    -------
    Dict with deletion curve and summary statistics.
    """
    if steps is None:
        steps = [round(k * 0.1, 1) for k in range(11)]  # 0.0 to 1.0

    h, w = image_array.shape[:2]
    n_pixels = h * w

    if fill_value is None:
        fill_value = float(np.mean(image_array))

    sorted_indices = _get_sorted_pixel_indices(heatmap.reshape(h, w), descending=True)
    flat_image = image_array.reshape(n_pixels, 3).copy()

    confidences = []
    for fraction in steps:
        n_mask = int(fraction * n_pixels)
        masked = flat_image.copy()
        if n_mask > 0:
            masked[sorted_indices[:n_mask]] = fill_value
        masked_image = masked.reshape(h, w, 3)
        try:
            conf = float(model_fn(masked_image))
        except Exception as exc:
            conf = float("nan")
        confidences.append({"fraction_masked": fraction, "confidence": conf})

    trapz_fn = getattr(np, "trapezoid", np.trapz)
    conf_values = [c["confidence"] for c in confidences if not np.isnan(c["confidence"])]
    auc = float(trapz_fn(conf_values, dx=1.0 / max(1, len(conf_values) - 1))) if len(conf_values) >= 2 else None

    baseline_conf = confidences[0]["confidence"] if confidences else None
    half_conf = next((c["confidence"] for c in confidences if abs(c["fraction_masked"] - 0.5) < 1e-6), None)
    delta_at_50pct = (float(half_conf) - float(baseline_conf)) if (half_conf is not None and baseline_conf is not None) else None

    return {
        "method": "deletion_test",
        "steps": confidences,
        "auc_deletion": auc,
        "delta_at_50pct_masked": delta_at_50pct,
        "interpretation": (
            "Lower AUC indicates faster confidence drop when top-attributed pixels are removed, "
            "suggesting more faithful attribution. Not a clinical metric."
        ),
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
    }


def insertion_test(
    image_array: np.ndarray,
    heatmap: np.ndarray,
    model_fn,
    steps: Optional[List[float]] = None,
    baseline_blur_sigma: float = 10.0,
) -> Dict[str, Any]:
    """Run the insertion fidelity test.

    Parameters
    ----------
    image_array : np.ndarray, shape (H, W, 3), float32 in [0, 1]
    heatmap : np.ndarray, shape (H, W), float32 in [0, 1]
    model_fn : callable(image_array) -> float (confidence for predicted class)
    steps : list of reveal fractions (default: [0, 0.1, ..., 1.0])
    baseline_blur_sigma : sigma for Gaussian blur of baseline image.

    Returns
    -------
    Dict with insertion curve and summary statistics.
    """
    if steps is None:
        steps = [round(k * 0.1, 1) for k in range(11)]

    h, w = image_array.shape[:2]
    n_pixels = h * w

    # Create blurred baseline (simple box blur for scipy-free implementation)
    # Fall back to mean image if scipy is not available
    try:
        from scipy.ndimage import gaussian_filter

        baseline = gaussian_filter(image_array, sigma=[baseline_blur_sigma, baseline_blur_sigma, 0])
    except ImportError:
        baseline = np.full_like(image_array, np.mean(image_array))

    sorted_indices = _get_sorted_pixel_indices(heatmap.reshape(h, w), descending=True)
    flat_orig = image_array.reshape(n_pixels, 3)
    flat_base = baseline.reshape(n_pixels, 3).copy()

    confidences = []
    for fraction in steps:
        n_reveal = int(fraction * n_pixels)
        revealed = flat_base.copy()
        if n_reveal > 0:
            revealed[sorted_indices[:n_reveal]] = flat_orig[sorted_indices[:n_reveal]]
        revealed_image = revealed.reshape(h, w, 3)
        try:
            conf = float(model_fn(revealed_image))
        except Exception:
            conf = float("nan")
        confidences.append({"fraction_revealed": fraction, "confidence": conf})

    trapz_fn = getattr(np, "trapezoid", np.trapz)
    conf_values = [c["confidence"] for c in confidences if not np.isnan(c["confidence"])]
    auc = float(trapz_fn(conf_values, dx=1.0 / max(1, len(conf_values) - 1))) if len(conf_values) >= 2 else None

    return {
        "method": "insertion_test",
        "steps": confidences,
        "auc_insertion": auc,
        "interpretation": (
            "Higher AUC indicates faster confidence rise when top-attributed pixels are revealed, "
            "suggesting more faithful attribution. Not a clinical metric."
        ),
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
    }
