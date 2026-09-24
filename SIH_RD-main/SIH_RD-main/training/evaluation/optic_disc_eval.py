"""Optic disc evaluation utilities for SIH-26038 (offline / research use).

This module provides evaluation utilities for optic disc localization
against the IDRiD binary mask ground truth.

SCOPE: Offline evaluation only. NOT part of the inference pipeline.
       No model inference is performed here — this evaluates the
       quality of a hypothetical OD model's predictions against ground truth.

DATA AVAILABLE:
  - IDRiD OD binary masks: 54 train + 27 test (verified locally)
  - Annotation format: binary TIF mask (white = OD region)
  - Centroid of white pixels = ground-truth OD center

METRICS USED (and why):
  - Dice coefficient: Standard segmentation overlap metric, symmetric,
    appropriate for binary mask comparison.
  - IoU (Jaccard): Alternative overlap metric, stricter than Dice.
  - Centroid localization error (pixels): Measures how far the predicted
    OD center is from the ground-truth center. Appropriate for localization
    evaluation when ground truth is a mask (centroid approximated).
  - Normalized localization error: centroid_error / image_diagonal.
    Allows comparison across images with different resolutions.

METRICS NOT USED (and why):
  - Accuracy, sensitivity, specificity: These are classification metrics,
    not appropriate for pixel-level segmentation/localization evaluation.
  - AUC: Requires probability outputs; mask centroid distance is more direct.

CLINICAL STATUS: NOT CLINICALLY VALIDATED. Research prototype only.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


def evaluate_od_localization_against_idrid(
    predicted_masks: List[Dict[str, Any]],
    split: str = "test",
    project_root: Optional[Path] = None,
) -> Dict[str, Any]:
    """Evaluate predicted OD masks/centroids against IDRiD ground truth.

    Parameters
    ----------
    predicted_masks : List of dicts with keys:
        - "image_id": str (e.g. "IDRiD_55")
        - "mask": np.ndarray (bool) or None
        - "centroid": Tuple[float, float] or None  (x, y)
    split : "train" or "test"
    project_root : Path to project root

    Returns
    -------
    Dict with per-image results and summary statistics.
    """
    from app.inference.optic_disc import (
        load_idrid_od_masks,
        compute_dice,
        compute_iou,
        compute_centroid_localization_error,
        _compute_centroid,
    )

    gt_records = load_idrid_od_masks(split=split, project_root=project_root)
    gt_by_id = {r["image_id"]: r for r in gt_records}
    pred_by_id = {p["image_id"]: p for p in predicted_masks}

    per_image_results = []
    dice_scores = []
    iou_scores = []
    centroid_errors = []

    for image_id, gt_record in gt_by_id.items():
        gt_mask = gt_record.get("mask")
        pred = pred_by_id.get(image_id)
        pred_mask = pred.get("mask") if pred else None

        if gt_mask is None:
            per_image_results.append({
                "image_id": image_id,
                "dice": None,
                "iou": None,
                "centroid_error_px": None,
                "normalized_centroid_error": None,
                "error": "gt_load_failed",
            })
            continue

        if pred_mask is None:
            per_image_results.append({
                "image_id": image_id,
                "dice": None,
                "iou": None,
                "centroid_error_px": None,
                "normalized_centroid_error": None,
                "error": "no_prediction",
            })
            continue

        # Ensure same shape for comparison
        if gt_mask.shape != pred_mask.shape:
            per_image_results.append({
                "image_id": image_id,
                "dice": None,
                "iou": None,
                "centroid_error_px": None,
                "normalized_centroid_error": None,
                "error": f"shape_mismatch: gt={gt_mask.shape} pred={pred_mask.shape}",
            })
            continue

        dice = compute_dice(pred_mask, gt_mask)
        iou = compute_iou(pred_mask, gt_mask)
        centroid_err = compute_centroid_localization_error(pred_mask, gt_mask)

        h, w = gt_mask.shape
        diagonal = math.sqrt(h * h + w * w)
        norm_err = (centroid_err / diagonal) if (centroid_err is not None and diagonal > 0) else None

        dice_scores.append(dice)
        iou_scores.append(iou)
        if centroid_err is not None:
            centroid_errors.append(centroid_err)

        per_image_results.append({
            "image_id": image_id,
            "dice": dice,
            "iou": iou,
            "centroid_error_px": centroid_err,
            "normalized_centroid_error": norm_err,
            "error": None,
        })

    def _safe_mean(lst: List[float]) -> Optional[float]:
        return float(np.mean(lst)) if lst else None

    def _safe_std(lst: List[float]) -> Optional[float]:
        return float(np.std(lst)) if lst else None

    return {
        "split": split,
        "ground_truth_images": len(gt_records),
        "evaluated_images": len([r for r in per_image_results if r["error"] is None]),
        "skipped": len([r for r in per_image_results if r["error"] is not None]),
        "summary": {
            "mean_dice": _safe_mean(dice_scores),
            "std_dice": _safe_std(dice_scores),
            "mean_iou": _safe_mean(iou_scores),
            "std_iou": _safe_std(iou_scores),
            "mean_centroid_error_px": _safe_mean(centroid_errors),
            "std_centroid_error_px": _safe_std(centroid_errors),
        },
        "per_image": per_image_results,
        "metrics_rationale": {
            "dice": "Standard symmetric overlap metric for binary segmentation masks.",
            "iou": "Stricter alternative to Dice; penalises false positives more.",
            "centroid_error_px": "Euclidean distance between predicted and GT mask centroids.",
            "normalized_centroid_error": "centroid_error / image_diagonal; resolution-invariant.",
        },
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
        "note": (
            "This is offline evaluation against IDRiD ground truth. "
            "It measures agreement with expert-annotated masks, NOT clinical localization accuracy. "
            "No model inference is performed in this function."
        ),
    }
