"""Unit tests for clinical readability protocol layer."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from PIL import Image
from training.quality import compute_quality_features
from app.inference.clinical_readability import (
    assess_clinical_readability,
    READABILITY_DIMENSIONS,
    ANNOTATION_PROTOCOL,
)


class ClinicalReadabilityTest(unittest.TestCase):
    def _features_for(self, color: tuple, size: tuple = (100, 100)):
        image = Image.new("RGB", size, color)
        return compute_quality_features(image)

    def test_always_returns_not_validated_status(self) -> None:
        """Clinical readability status is always not_validated (no verified labels)."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        self.assertEqual(result["status"], "not_validated")

    def test_gradable_is_always_null(self) -> None:
        """gradable field must be None — no thresholds exist."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        self.assertIsNone(result["gradable"])

    def test_observations_contains_expected_keys(self) -> None:
        """observations must contain focus, illumination, retinal_field, overexposure, underexposure."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        obs = result["observations"]
        for key in ["focus", "illumination", "retinal_field", "overexposure_indicator", "underexposure_indicator"]:
            self.assertIn(key, obs, f"Missing observation key: {key}")

    def test_missing_data_fields_documented(self) -> None:
        """missing_data must document all uncollected annotation types."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        self.assertIn("missing_data", result)
        missing = result["missing_data"]
        self.assertEqual(missing["clinical_gradability_labels"], "NOT_COLLECTED")
        self.assertEqual(missing["optic_disc_visibility_labels"], "NOT_COLLECTED")

    def test_annotation_protocol_required_is_not_collected(self) -> None:
        """The annotation protocol must declare NOT_COLLECTED status."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        protocol = result["annotation_protocol_required"]
        self.assertEqual(protocol["status"], "NOT_COLLECTED")
        self.assertIn("gradable", protocol["required_labels"])
        self.assertIn("ungradable", protocol["required_labels"])

    def test_note_mentions_not_validated(self) -> None:
        """note field must contain the not_validated warning."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        self.assertIn("NOT VALIDATED", result["note"])

    def test_observations_include_numeric_sharpness(self) -> None:
        """focus observation must contain sharpness_laplacian_variance as a number."""
        features = self._features_for((120, 80, 40))
        result = assess_clinical_readability(features)
        sharpness = result["observations"]["focus"]["sharpness_laplacian_variance"]
        self.assertIsInstance(sharpness, float)

    def test_readability_dimensions_list_non_empty(self) -> None:
        """READABILITY_DIMENSIONS should define at least 6 clinical dimensions."""
        self.assertGreaterEqual(len(READABILITY_DIMENSIONS), 6)


if __name__ == "__main__":
    unittest.main()
