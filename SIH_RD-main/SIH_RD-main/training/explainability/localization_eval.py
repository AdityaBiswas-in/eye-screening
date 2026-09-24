"""Localization agreement evaluation for SIH-26038 explainability validation.

This module compares Grad-CAM attribution maps against IDRiD lesion segmentation
masks to measure localization agreement.

IMPORTANT CAVEATS:
  1. This is NOT clinical validation.
  2. Grad-CAM is a model-attribution method, not a lesion detector.
  3. Agreement between Grad-CAM and lesion masks measures attribution overlap,
     not diagnostic accuracy.
  4. IDRiD lesion masks cover only 81 images (partial subset), not all 516.
  5. Lesion class availability:
       MA: 81 train images (all)
       HE: 80 train images (1 missing)
       EX: 81 train images (all)
       SE: 40 train images (partial)

METRICS USED (and why):
  - IoU at 50th-percentile threshold: Measures overlap when Grad-CAM is
    binarized at its median value. The threshold is data-derived, not arbitrary.
  - Pointing-game accuracy: Whether the maximum-attribution pixel falls
    inside the annotated lesion region. Simple, interpretable metric.
  - Overlap fraction: Fraction of GT mask pixels that have above-median
    attribution. Measures coverage, not sharpness.

METRICS NOT USED (and why not):
  - Clinical sensitivity/specificity: These require clinically validated
    thresholds, which do not exist in this project.
  - A single "explanation score": Misleading for a multi-dimensional phenomenon.

DATA REQUIRED:
  - IDRiD lesion masks (MA, HE, EX, SE) — locally available for 81 images
  - Corresponding Grad-CAM maps — generated from E9 model

STATUS: EXPERIMENTAL / NOT CLINICALLY VALIDATED
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np


# ---------------------------------------------------------------------------
# IDRiD lesion mask paths
# ---------------------------------------------------------------------------

_LESION_DIRS = {
    "ma": "data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/1. Microaneurysms",
    "he": "data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/2. Haemorrhages",
    "ex": "data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/3. Hard Exudates",
    "se": "data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/4. Soft Exudates",
}

_LESION_MASK_SUFFIXES = {
    "ma": "_MA.tif",
    "he": "_HE.tif",
    "ex": "_EX.tif",
    "se": "_SE.tif",
}


def _load_mask(path: Path) -> Optional[np.ndarray]:
    """Load a binary lesion mask as bool array. Returns None on failure."""
    try:
        from PIL import Image

        img = Image.open(path).convert("L")
        return np.asarray(img, dtype=np.uint8) > 127
    except Exception:
        return None


def _binarize_at_median(heatmap: np.ndarray) -> np.ndarray:
    """Binarize a heatmap at its median value. Returns bool array."""
    threshold = float(np.median(heatmap))
    return heatmap >= threshold


def compute_iou_binary(a: np.ndarray, b: np.ndarray) -> float:
    """Compute IoU between two bool arrays."""
    intersection = int(np.logical_and(a, b).sum())
    union = int(np.logical_or(a, b).sum())
    if union == 0:
        return 1.0
    return intersection / union


def compute_pointing_game_accuracy(
    heatmap: np.ndarray, mask: np.ndarray
) -> bool:
    """Pointing-game: Is the maximum-attribution pixel inside the GT mask?"""
    if not mask.any():
        return False  # No annotated region — undefined
    max_idx = np.unravel_index(np.argmax(heatmap), heatmap.shape)
    return bool(mask[max_idx])


def compute_overlap_fraction(
    heatmap: np.ndarray, mask: np.ndarray, threshold: Optional[float] = None
) -> Optional[float]:
    """Fraction of GT mask pixels that have above-threshold attribution.

    If threshold is None, uses the median of the heatmap.
    Returns None if mask is empty (no annotated region).
    """
    if not mask.any():
        return None
    if threshold is None:
        threshold = float(np.median(heatmap))
    above_threshold = heatmap >= threshold
    mask_pixels = int(mask.sum())
    if mask_pixels == 0:
        return None
    overlap = int(np.logical_and(above_threshold, mask).sum())
    return overlap / mask_pixels


def evaluate_gradcam_localization(
    image_id: str,
    gradcam_heatmap: np.ndarray,
    lesion_type: str,
    project_root: Optional[Path] = None,
) -> Dict[str, Any]:
    """Evaluate Grad-CAM localization for a single image against IDRiD masks.

    Parameters
    ----------
    image_id : str, e.g. "IDRiD_01"
    gradcam_heatmap : np.ndarray, float32 or float64, values in [0, 1]
    lesion_type : one of "ma", "he", "ex", "se"
    project_root : Path or None

    Returns
    -------
    Dict with localization metrics and status.
    """
    root = project_root or Path(".")
    lesion_type = lesion_type.lower()

    if lesion_type not in _LESION_DIRS:
        return {
            "image_id": image_id,
            "lesion_type": lesion_type,
            "status": "invalid_lesion_type",
            "iou_at_median": None,
            "pointing_game": None,
            "overlap_fraction": None,
            "error": f"lesion_type must be one of {list(_LESION_DIRS)}",
        }

    mask_dir = root / _LESION_DIRS[lesion_type]
    suffix = _LESION_MASK_SUFFIXES[lesion_type]
    mask_path = mask_dir / f"{image_id}{suffix}"

    if not mask_path.exists():
        return {
            "image_id": image_id,
            "lesion_type": lesion_type,
            "status": "mask_not_found",
            "mask_path": str(mask_path),
            "iou_at_median": None,
            "pointing_game": None,
            "overlap_fraction": None,
            "note": (
                "Lesion mask does not exist for this image/lesion combination. "
                "SE masks are only available for 40 of 81 images."
            ),
        }

    gt_mask = _load_mask(mask_path)
    if gt_mask is None:
        return {
            "image_id": image_id,
            "lesion_type": lesion_type,
            "status": "mask_load_failed",
            "iou_at_median": None,
            "pointing_game": None,
            "overlap_fraction": None,
        }

    # Resize heatmap to mask dimensions if needed
    heatmap = gradcam_heatmap
    if heatmap.shape != gt_mask.shape:
        try:
            from PIL import Image

            h_img = Image.fromarray(
                (heatmap.clip(0, 1) * 255).astype(np.uint8)
            ).resize((gt_mask.shape[1], gt_mask.shape[0]))
            heatmap = np.asarray(h_img, dtype=np.float32) / 255.0
        except Exception as exc:
            return {
                "image_id": image_id,
                "lesion_type": lesion_type,
                "status": "resize_failed",
                "error": str(exc),
                "iou_at_median": None,
                "pointing_game": None,
                "overlap_fraction": None,
            }

    binary_heatmap = _binarize_at_median(heatmap)
    iou = compute_iou_binary(binary_heatmap, gt_mask)
    pointing = compute_pointing_game_accuracy(heatmap, gt_mask)
    overlap = compute_overlap_fraction(heatmap, gt_mask)

    return {
        "image_id": image_id,
        "lesion_type": lesion_type,
        "status": "evaluated",
        "iou_at_median": iou,
        "pointing_game_correct": pointing,
        "overlap_fraction": overlap,
        "gt_mask_pixel_count": int(gt_mask.sum()),
        "gt_mask_empty": not gt_mask.any(),
        "metrics_note": {
            "iou_at_median": "IoU between median-binarized Grad-CAM and GT mask.",
            "pointing_game": "Is the peak attribution pixel inside the GT lesion region?",
            "overlap_fraction": "Fraction of GT pixels with above-median attribution.",
        },
        "status_label": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
    }
