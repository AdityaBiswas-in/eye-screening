# Optic Disc Protocol

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** DATA AVAILABLE / MODEL NOT IMPLEMENTED  
**Last updated:** 2026-09-24  

---

## 1. Verified Data Availability

Binary optic disc (OD) masks are verified present on the local filesystem:
- **Training set:** 54 images (`IDRiD_01_OD.tif` to `IDRiD_54_OD.tif`) in `data/idrid/A. Segmentation/2. All Segmentation Groundtruths/a. Training Set/5. Optic Disc/`
- **Testing set:** 27 images (`IDRiD_55_OD.tif` to `IDRiD_81_OD.tif`) in `data/idrid/A. Segmentation/2. All Segmentation Groundtruths/b. Testing Set/5. Optic Disc/`
- **Format:** Binary TIF masks (white pixels = 255 = OD region).

---

## 2. Component Status & API Contract

The frozen primary model E9 does NOT contain an optic-disc segmentation/localization head. Per project rules, E9 is locked and cannot be retrained.

The API exposes an explicit blocker response:

```json
{
  "structures": {
    "optic_disc": {
      "status": "not_implemented",
      "data_available": true,
      "data_description": "IDRiD optic disc binary masks available locally (54 train, 27 test).",
      "blocker": "No trained optic disc localization model is deployed. Frozen E9 has no OD head.",
      "validation": {
        "metric": "Dice, IoU, centroid_localization_error_px",
        "dataset": "IDRiD segmentation subset (81 images)",
        "status": "not_evaluated"
      },
      "center": null,
      "confidence": null
    }
  }
}
```

---

## 3. Evaluation Utilities

`app/inference/optic_disc.py` and `training/evaluation/optic_disc_eval.py` provide research evaluation functions:
- `compute_dice(mask_a, mask_b)`: Dice similarity coefficient
- `compute_iou(mask_a, mask_b)`: Intersection over Union (Jaccard index)
- `compute_centroid_localization_error(mask_pred, mask_gt)`: Euclidean distance between centroids in pixels
- `compute_gt_centroids_from_masks(split)`: Computes ground-truth centroids from IDRiD masks.
