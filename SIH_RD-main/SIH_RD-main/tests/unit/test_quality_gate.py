"""Unit tests for technical input quality gate and early API rejection."""

from __future__ import annotations

import asyncio
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from starlette.datastructures import Headers, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from app.inference.quality_gate import evaluate_technical_quality
from training.quality import compute_quality_features
import app.main as api_main


class QualityGateTest(unittest.TestCase):
    def test_valid_image_accepted_by_gate(self) -> None:
        image = Image.new("RGB", (384, 384), (120, 80, 40))
        features = compute_quality_features(image)
        gate = evaluate_technical_quality(image, features)
        self.assertTrue(gate["technical_valid"])
        self.assertEqual(gate["decision"], "accept")
        self.assertEqual(len(gate["issues"]), 0)
        self.assertFalse(gate["recapture_required"])
        self.assertEqual(gate["gradability_stage"], "passed_technical_checks")

    def test_blank_dark_image_rejected_by_gate(self) -> None:
        image = Image.new("RGB", (384, 384), (0, 0, 0))
        features = compute_quality_features(image)
        gate = evaluate_technical_quality(image, features)
        self.assertFalse(gate["technical_valid"])
        self.assertEqual(gate["decision"], "reject")
        self.assertTrue(gate["recapture_required"])
        self.assertIn("no_retinal_field_detected", gate["issues"])
        self.assertEqual(gate["gradability_stage"], "technical_quality_failure")

    def test_microscopic_image_rejected_by_gate(self) -> None:
        image = Image.new("RGB", (10, 10), (120, 80, 40))
        features = compute_quality_features(image)
        gate = evaluate_technical_quality(image, features)
        self.assertFalse(gate["technical_valid"])
        self.assertEqual(gate["decision"], "reject")
        self.assertIn("unusable_image_dimensions", gate["issues"])

    def test_severely_overexposed_image_rejected(self) -> None:
        """Image where >80% of pixels are saturated (white) triggers overexposure check."""
        # Create an image that is 95% white (saturated) — plainly unusable
        image = Image.new("RGB", (100, 100), (255, 255, 255))
        features = compute_quality_features(image)
        gate = evaluate_technical_quality(image, features)
        self.assertFalse(gate["technical_valid"])
        self.assertIn("severe_overexposure", gate["issues"])
        self.assertEqual(gate["gradability_stage"], "technical_quality_failure")

    def test_severely_underexposed_image_rejected(self) -> None:
        """Image where >90% of pixels are dark triggers underexposure check."""
        # Pixel value = 5 is below BACKGROUND_THRESHOLD=10, so dark_pixel_fraction will be ~1.0
        import numpy as np
        arr = np.full((100, 100, 3), 5, dtype=np.uint8)
        image = Image.fromarray(arr)
        features = compute_quality_features(image)
        gate = evaluate_technical_quality(image, features)
        self.assertFalse(gate["technical_valid"])
        # Underexposure AND no-retinal-field should both fire
        self.assertTrue(
            "severe_underexposure" in gate["issues"]
            or "no_retinal_field_detected" in gate["issues"]
        )
        self.assertEqual(gate["gradability_stage"], "technical_quality_failure")

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_predict_early_rejection_for_blank_image(self, mock_gradcam, mock_model) -> None:
        """Blank dark image must trigger technical rejection without invoking E9 or Grad-CAM."""
        blank_image = Image.new("RGB", (384, 384), (0, 0, 0))
        buffer = io.BytesIO()
        blank_image.save(buffer, format="PNG")
        buffer.seek(0)
        upload = UploadFile(
            file=buffer,
            filename="blank.png",
            headers=Headers({"content-type": "image/png"}),
        )
        api_main.MODEL = mock_model
        api_main.GRADCAM = mock_gradcam
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        self.assertEqual(result["status"], "rejected")
        # Assertions use new nested structure: image_quality.technical
        self.assertEqual(result["image_quality"]["technical"]["decision"], "reject")
        self.assertFalse(result["image_quality"]["technical"]["valid"])
        self.assertTrue(result["image_quality"]["recapture_required"])
        self.assertEqual(result["image_quality"]["gradability_decision"], "technical_quality_failure")
        self.assertIsNone(result["dr"])
        self.assertIsNone(result["explainability"])

        # Crucial: E9 model forward and Grad-CAM generation were NOT called
        mock_model.forward_e8.assert_not_called()
        mock_gradcam.generate.assert_not_called()

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_rejected_image_has_clinical_readability_field(self, mock_gradcam, mock_model) -> None:
        """Rejected images must include clinical_readability with status=not_validated."""
        blank_image = Image.new("RGB", (384, 384), (0, 0, 0))
        buffer = io.BytesIO()
        blank_image.save(buffer, format="PNG")
        buffer.seek(0)
        upload = UploadFile(
            file=buffer,
            filename="blank.png",
            headers=Headers({"content-type": "image/png"}),
        )
        api_main.MODEL = mock_model
        api_main.GRADCAM = mock_gradcam
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        self.assertIn("clinical_readability", result["image_quality"])
        self.assertEqual(result["image_quality"]["clinical_readability"]["status"], "not_validated")
        self.assertIsNone(result["image_quality"]["clinical_readability"]["gradable"])


if __name__ == "__main__":
    unittest.main()
