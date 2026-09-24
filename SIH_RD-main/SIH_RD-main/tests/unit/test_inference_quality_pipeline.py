"""Tests for safe default quality routing without clinical threshold claims."""

from __future__ import annotations

import asyncio
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from PIL import Image
from starlette.datastructures import Headers, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from app.inference.predictor import build_inference_transform
from app.inference.quality_pipeline import EnhancementConfig, prepare_quality_aware_image
import app.main as api_main


class InferenceQualityPipelineTest(unittest.TestCase):
    def test_default_routing_preserves_pixels_and_does_not_reject(self) -> None:
        image = Image.new("RGB", (40, 30), (80, 60, 40))
        routed, features, status = prepare_quality_aware_image(image)
        self.assertEqual(routed.tobytes(), image.tobytes())
        self.assertEqual(status["status"], "features_available")
        self.assertIsNone(status["gradable"])
        self.assertEqual(status["decision"], "not_assessed")
        self.assertGreaterEqual(features.retinal_field_coverage, 0.0)

    def test_optional_enhancement_is_explicit(self) -> None:
        image = Image.new("RGB", (40, 30), (20, 40, 80))
        _, _, status = prepare_quality_aware_image(
            image, EnhancementConfig(illumination_normalization=True)
        )
        self.assertEqual(status["status"], "enhancement_applied")
        self.assertEqual(status["enhancement_applied"], ["bounded_illumination_normalization"])

    def test_api_transform_matches_canonical_evaluation_shape(self) -> None:
        tensor = build_inference_transform()(Image.new("RGB", (40, 30)))
        self.assertEqual(tuple(tensor.shape), (3, 384, 384))

    def test_non_image_upload_is_a_controlled_bad_request(self) -> None:
        upload = UploadFile(
            file=io.BytesIO(b"not an image"),
            filename="invalid.txt",
            headers=Headers({"content-type": "text/plain"}),
        )
        with (
            patch.object(api_main, "MODEL", object()),
            patch.object(api_main, "GRADCAM", object()),
        ):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(api_main.predict(upload))
        self.assertEqual(raised.exception.status_code, 400)

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_predict_returns_structured_quality_fields(self, mock_gradcam, mock_model) -> None:
        import torch
        from PIL import Image
        image = Image.new("RGB", (40, 30), (80, 60, 40))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        
        upload = UploadFile(
            file=buffer,
            filename="test.png",
            headers=Headers({"content-type": "image/png"}),
        )

        mock_model.forward_e8.return_value = {
            "dr_logits": torch.zeros(1, 5),
            "referable_logits": torch.zeros(1, 1),
            "ma_logits": torch.zeros(1, 1),
            "he_logits": torch.zeros(1, 1),
            "ex_logits": torch.zeros(1, 1),
            "se_logits": torch.zeros(1, 1),
        }
        mock_gradcam.generate.return_value = {
            "heatmap": torch.zeros(1, 1, 384, 384),
            "output": mock_model.forward_e8.return_value,
        }
        api_main.DEVICE = torch.device("cpu")
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        quality = result["image_quality"]
        
        self.assertIn("technical", quality)
        self.assertIn("clinical_readability", quality)
        self.assertIn("gradability_decision", quality)
        self.assertIn("gradable", quality)
        self.assertIn("recapture_required", quality)
        
        tech = quality["technical"]
        self.assertIn("decision", tech)
        self.assertIn("valid", tech)
        self.assertIn("issues", tech)
        self.assertIn("action", tech)
        self.assertIn("focus", tech)
        self.assertIn("illumination", tech)
        self.assertIn("field_of_view", tech)
        self.assertIn("enhancement", tech)
        
        self.assertIsNone(quality["gradable"])
        self.assertEqual(quality["gradability_decision"], "not_assessed")
        self.assertEqual(tech["action"], "continue_with_caution")
        self.assertFalse(quality["recapture_required"])
        self.assertFalse(tech["enhancement"]["clahe"])
        self.assertFalse(tech["enhancement"]["illumination_normalization"])
        self.assertFalse(tech["enhancement"]["denoising"])

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_annotated_report_in_response(self, mock_gradcam, mock_model) -> None:
        """annotated_report must be present and contain all required summary fields."""
        import torch
        image = Image.new("RGB", (40, 30), (80, 60, 40))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        upload = UploadFile(
            file=buffer,
            filename="test.png",
            headers=Headers({"content-type": "image/png"}),
        )
        mock_model.forward_e8.return_value = {
            "dr_logits": torch.zeros(1, 5),
            "referable_logits": torch.zeros(1, 1),
            "ma_logits": torch.zeros(1, 1),
            "he_logits": torch.zeros(1, 1),
            "ex_logits": torch.zeros(1, 1),
            "se_logits": torch.zeros(1, 1),
        }
        mock_gradcam.generate.return_value = {
            "heatmap": torch.zeros(1, 1, 384, 384),
            "output": mock_model.forward_e8.return_value,
        }
        api_main.DEVICE = torch.device("cpu")
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        self.assertIn("annotated_report", result)
        report = result["annotated_report"]
        for field in [
            "dr_grade", "dr_label", "dr_confidence",
            "referable_dr", "uncertainty_level", "conformal_set_size",
            "evidence_reliable", "review_required",
            "lesion_evidence_summary", "gradcam_available",
            "recommendation", "disclaimer",
        ]:
            self.assertIn(field, report, f"annotated_report missing field: {field}")
        self.assertIn("microaneurysm", report["lesion_evidence_summary"])
        self.assertIn("hemorrhage", report["lesion_evidence_summary"])
        self.assertIn("hard_exudate", report["lesion_evidence_summary"])
        self.assertIn("soft_exudate", report["lesion_evidence_summary"])

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_conformal_set_size_in_uncertainty(self, mock_gradcam, mock_model) -> None:
        """uncertainty block must expose conformal_set_size and review_trigger."""
        import torch
        image = Image.new("RGB", (40, 30), (80, 60, 40))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        upload = UploadFile(
            file=buffer,
            filename="test.png",
            headers=Headers({"content-type": "image/png"}),
        )
        mock_model.forward_e8.return_value = {
            "dr_logits": torch.zeros(1, 5),
            "referable_logits": torch.zeros(1, 1),
            "ma_logits": torch.zeros(1, 1),
            "he_logits": torch.zeros(1, 1),
            "ex_logits": torch.zeros(1, 1),
            "se_logits": torch.zeros(1, 1),
        }
        mock_gradcam.generate.return_value = {
            "heatmap": torch.zeros(1, 1, 384, 384),
            "output": mock_model.forward_e8.return_value,
        }
        api_main.DEVICE = torch.device("cpu")
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        uncertainty = result["uncertainty"]
        self.assertIn("conformal_set_size", uncertainty)
        self.assertIn("review_trigger", uncertainty)
        self.assertIsInstance(uncertainty["conformal_set_size"], int)
        self.assertIsInstance(uncertainty["review_trigger"], bool)

    def test_oversized_upload_rejected(self) -> None:
        """Uploads larger than 20MB must be rejected with HTTP 413."""
        oversized_bytes = b"X" * (21 * 1024 * 1024)
        upload = UploadFile(
            file=io.BytesIO(oversized_bytes),
            filename="big.png",
            headers=Headers({"content-type": "image/png"}),
        )
        with (
            patch.object(api_main, "MODEL", object()),
            patch.object(api_main, "GRADCAM", object()),
        ):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(api_main.predict(upload))
        self.assertEqual(raised.exception.status_code, 413)


if __name__ == "__main__":
    unittest.main()
