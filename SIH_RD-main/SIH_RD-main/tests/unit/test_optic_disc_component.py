"""Unit tests for optic disc component and evaluation utilities."""

from __future__ import annotations

import unittest
from pathlib import Path

import numpy as np

from app.inference.optic_disc import (
    compute_centroid_localization_error,
    compute_dice,
    compute_gt_centroids_from_masks,
    compute_iou,
    get_api_response,
    load_idrid_od_masks,
)


class TestOpticDiscComponent(unittest.TestCase):
    def test_get_api_response_returns_structured_blocker(self) -> None:
        resp = get_api_response()
        self.assertEqual(resp["status"], "not_implemented")
        self.assertTrue(resp["data_available"])
        self.assertIn("blocker", resp)
        self.assertIn("validation", resp)
        self.assertIsNone(resp["center"])
        self.assertIsNone(resp["confidence"])

    def test_compute_dice(self) -> None:
        mask_a = np.zeros((10, 10), dtype=bool)
        mask_b = np.zeros((10, 10), dtype=bool)
        mask_a[2:5, 2:5] = True
        mask_b[2:5, 2:5] = True
        self.assertEqual(compute_dice(mask_a, mask_b), 1.0)

        mask_b[2:5, 2:5] = False
        mask_b[3:6, 3:6] = True
        # intersection 4, total 9+9 = 18 => 2*4/18 = 4/9
        self.assertAlmostEqual(compute_dice(mask_a, mask_b), 8 / 18, places=4)

    def test_compute_iou(self) -> None:
        mask_a = np.zeros((10, 10), dtype=bool)
        mask_b = np.zeros((10, 10), dtype=bool)
        mask_a[2:5, 2:5] = True
        mask_b[2:5, 2:5] = True
        self.assertEqual(compute_iou(mask_a, mask_b), 1.0)

        mask_b[2:5, 2:5] = False
        mask_b[3:6, 3:6] = True
        # intersection 4, union 9+9-4 = 14 => 4/14
        self.assertAlmostEqual(compute_iou(mask_a, mask_b), 4 / 14, places=4)

    def test_compute_centroid_localization_error(self) -> None:
        mask_pred = np.zeros((10, 10), dtype=bool)
        mask_gt = np.zeros((10, 10), dtype=bool)
        mask_pred[2:4, 2:4] = True  # centroid (2.5, 2.5)
        mask_gt[5:7, 6:8] = True    # centroid (6.5, 5.5)

        err = compute_centroid_localization_error(mask_pred, mask_gt)
        self.assertIsNotNone(err)
        # dx = 4, dy = 3, dist = 5.0
        self.assertAlmostEqual(err, 5.0, places=4)

        # Empty mask returns None
        empty = np.zeros((10, 10), dtype=bool)
        self.assertIsNone(compute_centroid_localization_error(empty, mask_gt))

    def test_load_idrid_od_masks_train_split(self) -> None:
        project_root = Path(__file__).resolve().parents[2]
        records = load_idrid_od_masks(split="train", project_root=project_root)
        if records:
            self.assertEqual(len(records), 54)
            self.assertEqual(records[0]["image_id"], "IDRiD_01")
            self.assertIsNotNone(records[0]["mask"])

    def test_load_idrid_od_masks_test_split(self) -> None:
        project_root = Path(__file__).resolve().parents[2]
        records = load_idrid_od_masks(split="test", project_root=project_root)
        if records:
            self.assertEqual(len(records), 27)
            self.assertEqual(records[0]["image_id"], "IDRiD_55")
            self.assertIsNotNone(records[0]["mask"])

    def test_compute_gt_centroids_from_masks(self) -> None:
        project_root = Path(__file__).resolve().parents[2]
        summary = compute_gt_centroids_from_masks(split="train", project_root=project_root)
        self.assertIn("split", summary)
        self.assertEqual(summary["split"], "train")
        self.assertIn("status", summary)
        self.assertIn("NOT CLINICALLY VALIDATED", summary["status"])


if __name__ == "__main__":
    unittest.main()
