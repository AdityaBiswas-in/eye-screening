"""Unit tests for explainability evaluation modules.

Covers:
  - localization_eval
  - fidelity_eval
  - stability_eval
  - consistency_eval
"""

from __future__ import annotations

import unittest
from pathlib import Path

import numpy as np

from training.explainability.consistency_eval import (
    _spearman_correlation,
    evaluate_evidence_grade_consistency,
)
from training.explainability.fidelity_eval import (
    deletion_test,
    insertion_test,
)
from training.explainability.localization_eval import (
    compute_iou_binary,
    compute_overlap_fraction,
    compute_pointing_game_accuracy,
    evaluate_gradcam_localization,
)
from training.explainability.stability_eval import (
    _cosine_similarity,
    evaluate_stability,
)


class TestExplanationValidation(unittest.TestCase):
    # -----------------------------------------------------------------------
    # Localization Eval
    # -----------------------------------------------------------------------

    def test_compute_iou_binary(self) -> None:
        a = np.zeros((10, 10), dtype=bool)
        b = np.zeros((10, 10), dtype=bool)
        a[2:5, 2:5] = True
        b[2:5, 2:5] = True
        self.assertEqual(compute_iou_binary(a, b), 1.0)

    def test_pointing_game_and_overlap_fraction(self) -> None:
        heatmap = np.zeros((10, 10), dtype=np.float32)
        heatmap[3, 3] = 1.0
        mask = np.zeros((10, 10), dtype=bool)
        mask[2:5, 2:5] = True

        self.assertTrue(compute_pointing_game_accuracy(heatmap, mask))
        overlap = compute_overlap_fraction(heatmap, mask, threshold=0.5)
        self.assertIsNotNone(overlap)
        self.assertEqual(overlap, 1 / 9)

    def test_evaluate_gradcam_localization_missing_mask(self) -> None:
        heatmap = np.zeros((384, 384), dtype=np.float32)
        res = evaluate_gradcam_localization(
            image_id="NONEXISTENT_IMAGE",
            gradcam_heatmap=heatmap,
            lesion_type="ma",
            project_root=Path("."),
        )
        self.assertEqual(res["status"], "mask_not_found")
        self.assertIsNone(res["iou_at_median"])

    # -----------------------------------------------------------------------
    # Fidelity Eval
    # -----------------------------------------------------------------------

    def test_deletion_and_insertion_tests(self) -> None:
        img = np.ones((10, 10, 3), dtype=np.float32)
        heatmap = np.zeros((10, 10), dtype=np.float32)
        heatmap[0, 0] = 1.0

        def dummy_model(x: np.ndarray) -> float:
            return float(x[0, 0, 0])

        del_res = deletion_test(img, heatmap, dummy_model, steps=[0.0, 0.5, 1.0])
        self.assertEqual(del_res["method"], "deletion_test")
        self.assertIsNotNone(del_res["auc_deletion"])

        ins_res = insertion_test(img, heatmap, dummy_model, steps=[0.0, 0.5, 1.0])
        self.assertEqual(ins_res["method"], "insertion_test")
        self.assertIsNotNone(ins_res["auc_insertion"])

    # -----------------------------------------------------------------------
    # Stability Eval
    # -----------------------------------------------------------------------

    def test_cosine_similarity(self) -> None:
        a = np.array([[1.0, 2.0], [3.0, 4.0]])
        b = np.array([[1.0, 2.0], [3.0, 4.0]])
        self.assertAlmostEqual(_cosine_similarity(a, b), 1.0, places=4)

    def test_evaluate_stability(self) -> None:
        img = np.ones((20, 20, 3), dtype=np.float32) * 0.5
        heatmap = np.ones((20, 20), dtype=np.float32)

        def dummy_gradcam(image: np.ndarray) -> np.ndarray:
            return np.ones((20, 20), dtype=np.float32)

        res = evaluate_stability(img, heatmap, dummy_gradcam, perturbation_names=["brightness_plus10"])
        self.assertIn("summary", res)
        self.assertAlmostEqual(res["summary"]["mean_cosine_similarity"], 1.0, places=4)

    # -----------------------------------------------------------------------
    # Consistency Eval
    # -----------------------------------------------------------------------

    def test_spearman_correlation(self) -> None:
        x = [0, 1, 2, 3, 4]
        y = [0.1, 0.2, 0.3, 0.4, 0.5]
        self.assertAlmostEqual(_spearman_correlation(x, y), 1.0, places=4)

        x_short = [0, 1]
        y_short = [0.1, 0.2]
        self.assertIsNone(_spearman_correlation(x_short, y_short))

    def test_evaluate_evidence_grade_consistency(self) -> None:
        grades = [0, 1, 2, 3, 4]
        activations = {
            "ma": [0.1, 0.2, 0.3, 0.4, 0.5],
            "he": [0.0, 0.1, 0.2, 0.3, 0.4],
        }
        res = evaluate_evidence_grade_consistency(grades, activations)
        self.assertEqual(res["method"], "spearman_rank_correlation")
        self.assertIn("ma", res["per_lesion"])
        self.assertAlmostEqual(res["per_lesion"]["ma"]["spearman_rho"], 1.0, places=4)


if __name__ == "__main__":
    unittest.main()
