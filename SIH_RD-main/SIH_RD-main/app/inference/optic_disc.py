"""Optic disc component for SIH-26038.

DATA STATUS:
  IDRiD optic disc binary masks ARE available locally:
    - Training: 54 images (IDRiD_01 – IDRiD_54) in
      data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/5. Optic Disc/
    - Testing: 27 images (IDRiD_55 – IDRiD_81) in
      data/idrid/A. Segmentation/2. All Segmentation Groundtruths/b. Testing Set/5. Optic Disc/

MODEL STATUS:
  NOT IMPLEMENTED for arbitrary inference.
  Reason: The frozen E9 checkpoint has no optic disc head. Retraining E9 is
  forbidden. A separate OD segmentation/localization model would need to be
  trained on the IDRiD OD masks. This has not been done.

WHAT THIS MODULE PROVIDES:
  1. An API blocker response (correctly reports data_available / model_not_trained).
  2. An offline evaluation utility for computing Dice, IoU, and centroid-based
     localization error from the IDRiD binary masks. This is for research
     reproducibility documentation, NOT for arbitrary inference.

ANNOTATION FORMAT:
  Binary TIF masks. White pixels (value = 255) indicate the optic disc region.
  Centroid of white pixels = approximated OD center coordinate.
  Annotation was provided for the 81-image lesion-segmentation subset only
  (not the full 516 disease-grading images).

EVALUATION METRICS:
  - Dice coefficient: 2|A∩B| / (|A| + |B|)
  - IoU (Jaccard): |A∩B| / |A∪B|
  - Centroid localization error: Euclidean distance between mask centroids (pixels)
  - Normalized localization error: centroid error / image diagonal

These metrics are appropriate because the annotation is a binary mask.
Do NOT report accuracy, sensitivity, or specificity as if this were a
classification task — this is a segmentation localization evaluation.

CLINICAL STATUS: NOT CLINICALLY VALIDATED.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_IDRID_OD_TRAIN_DIR = Path(
    "data/idrid/A. Segmentation/"
    "2. All Segmentation Groundtruths/"
    "a. Training Set/5. Optic Disc"
)

_IDRID_OD_TEST_DIR = Path(
    "data/idrid/A. Segmentation/"
    "2. All Segmentation Groundtruths/"
    "b. Testing Set/5. Optic Disc"
)


# ---------------------------------------------------------------------------
# API blocker response
# ---------------------------------------------------------------------------

def get_api_response() -> Dict[str, Any]:
    """Return the API blocker response for optic disc in the /predict endpoint.

    Returns a structured dict with:
      - status: "not_implemented" (model not trained)
      - data_available: True (IDRiD masks are locally present)
      - blocker: precise explanation of what is missing
      - validation: what would be needed for evaluation
    """
    return {
        "status": "not_implemented",
        "data_available": True,
        "data_description": (
            "IDRiD optic disc binary masks are available locally. "
            "54 training images (IDRiD_01–54) and 27 testing images (IDRiD_55–81). "
            "Format: binary TIF mask (white pixels = OD region)."
        ),
        "blocker": (
            "No trained optic disc localization or segmentation model is deployed. "
            "The frozen E9 checkpoint has no OD head. "
            "Retraining E9 or training a separate OD model is required but has not been done. "
            "No OD prediction is fabricated for this image."
        ),
        "validation": {
            "metric": "Dice, IoU, centroid_localization_error_px",
            "dataset": "IDRiD segmentation subset (81 images)",
            "status": "not_evaluated",
            "note": (
                "Evaluation utilities exist in training/evaluation/optic_disc_eval.py "
                "but cannot run without a trained OD model."
            ),
        },
        "center": None,
        "confidence": None,
        "note": "No optic disc prediction performed. Implement and train a separate OD model to enable this component.",
    }


# ---------------------------------------------------------------------------
# Offline evaluation utilities (research reproducibility — not inference)
# ---------------------------------------------------------------------------

def _load_od_mask(mask_path: Path) -> Optional[np.ndarray]:
    """Load a binary OD mask as a boolean numpy array.

    Returns None if the file cannot be loaded or PIL is unavailable.
    White pixels (> 127) are foreground (OD region).
    """
    try:
        from PIL import Image

        img = Image.open(mask_path).convert("L")
        return np.asarray(img, dtype=np.uint8) > 127
    except Exception:
        return None


def _compute_centroid(mask: np.ndarray) -> Optional[Tuple[float, float]]:
    """Compute the centroid (x, y) of a boolean mask. Returns None if mask is empty."""
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return float(np.mean(xs)), float(np.mean(ys))


def compute_dice(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    """Compute Dice coefficient between two boolean masks."""
    intersection = int(np.logical_and(mask_a, mask_b).sum())
    total = int(mask_a.sum()) + int(mask_b.sum())
    if total == 0:
        return 1.0  # Both empty — conventionally 1
    return 2.0 * intersection / total


def compute_iou(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    """Compute Intersection over Union between two boolean masks."""
    intersection = int(np.logical_and(mask_a, mask_b).sum())
    union = int(np.logical_or(mask_a, mask_b).sum())
    if union == 0:
        return 1.0  # Both empty
    return intersection / union


def compute_centroid_localization_error(
    mask_pred: np.ndarray,
    mask_gt: np.ndarray,
) -> Optional[float]:
    """Compute Euclidean distance between predicted and GT mask centroids (pixels).

    Returns None if either mask is empty (no centroid computable).
    """
    centroid_pred = _compute_centroid(mask_pred)
    centroid_gt = _compute_centroid(mask_gt)
    if centroid_pred is None or centroid_gt is None:
        return None
    dx = centroid_pred[0] - centroid_gt[0]
    dy = centroid_pred[1] - centroid_gt[1]
    return math.sqrt(dx * dx + dy * dy)


def load_idrid_od_masks(
    split: str = "train",
    project_root: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Load IDRiD optic disc masks for the specified split.

    Parameters
    ----------
    split : "train" (54 images) or "test" (27 images)
    project_root : Path to project root. Defaults to cwd.

    Returns
    -------
    List of dicts:
        {
            "image_id": str,
            "mask_path": Path,
            "mask": np.ndarray | None,  # bool array, None if load failed
            "load_error": str | None
        }
    """
    root = project_root or Path(".")
    if split == "train":
        mask_dir = root / _IDRID_OD_TRAIN_DIR
        suffix = "_OD.tif"
    elif split == "test":
        mask_dir = root / _IDRID_OD_TEST_DIR
        suffix = "_OD.tif"
    else:
        raise ValueError(f"split must be 'train' or 'test', got {split!r}")

    results = []
    if not mask_dir.exists():
        return results

    for mask_path in sorted(mask_dir.glob(f"*{suffix}")):
        image_id = mask_path.stem.replace("_OD", "")
        mask = _load_od_mask(mask_path)
        results.append({
            "image_id": image_id,
            "mask_path": mask_path,
            "mask": mask,
            "load_error": None if mask is not None else "load_failed",
        })

    return results


def compute_gt_centroids_from_masks(
    split: str = "train",
    project_root: Optional[Path] = None,
) -> Dict[str, Any]:
    """Compute ground-truth OD centroids from IDRiD binary masks.

    This is an offline research utility for establishing ground-truth OD
    center coordinates from the available binary masks.
    Centroid = mean of white-pixel coordinates in the mask.

    Returns a summary dict with per-image centroids and statistics.
    """
    records = load_idrid_od_masks(split=split, project_root=project_root)
    centroids = []
    errors = []

    per_image = []
    for record in records:
        if record["mask"] is None:
            errors.append(record["image_id"])
            per_image.append({
                "image_id": record["image_id"],
                "centroid_x": None,
                "centroid_y": None,
                "mask_pixel_count": None,
                "error": record["load_error"],
            })
            continue

        mask = record["mask"]
        centroid = _compute_centroid(mask)
        h, w = mask.shape
        if centroid is None:
            errors.append(record["image_id"])
            per_image.append({
                "image_id": record["image_id"],
                "centroid_x": None,
                "centroid_y": None,
                "mask_pixel_count": int(mask.sum()),
                "error": "empty_mask",
            })
        else:
            centroids.append(centroid)
            per_image.append({
                "image_id": record["image_id"],
                "centroid_x": centroid[0],
                "centroid_y": centroid[1],
                "normalized_centroid_x": centroid[0] / w if w > 0 else None,
                "normalized_centroid_y": centroid[1] / h if h > 0 else None,
                "mask_pixel_count": int(mask.sum()),
                "error": None,
            })

    return {
        "split": split,
        "total_images": len(records),
        "successful": len(centroids),
        "failed": len(errors),
        "per_image": per_image,
        "note": (
            "Centroids are computed from binary TIF mask white-pixel centroids. "
            "This is the ground-truth OD center for evaluation purposes. "
            "No model inference was performed."
        ),
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
    }
