"""End-to-end integration tests for SIH-26038 FastAPI application."""

from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app


class TestEndToEndAPI(unittest.TestCase):
    """Integration test suite for FastAPI /health and /predict endpoints."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.__exit__(None, None, None)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertTrue(data["model_loaded"])
        self.assertTrue(data["gradcam_loaded"])
        self.assertIsNotNone(data["device"])

    def test_predict_endpoint_valid_image(self) -> None:
        image = Image.new("RGB", (384, 384), color=(120, 80, 40))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        response = self.client.post(
            "/predict",
            files={"image": ("test_fundus.png", buffer, "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # 1. Top-level status
        self.assertEqual(data["status"], "reportable")

        # 2. Model block
        self.assertIn("model", data)
        self.assertEqual(data["model"]["experiment_family"], "E9")

        # 3. Image quality block
        self.assertIn("image_quality", data)
        self.assertIn("technical", data["image_quality"])
        self.assertIn("focus", data["image_quality"]["technical"])
        self.assertIn("illumination", data["image_quality"]["technical"])
        self.assertIn("field_of_view", data["image_quality"]["technical"])

        # 4. DR grading block
        self.assertIn("dr", data)
        self.assertIn(data["dr"]["grade"], [0, 1, 2, 3, 4])
        self.assertEqual(len(data["dr"]["class_probabilities"]), 5)

        # 5. Referable DR block
        self.assertIn("referable_dr", data)
        self.assertIsInstance(data["referable_dr"]["prediction"], bool)

        # 6. Uncertainty block
        self.assertIn("uncertainty", data)
        self.assertIn(data["uncertainty"]["level"], ["low", "moderate", "high"])
        self.assertIsInstance(data["uncertainty"]["conformal_prediction_set"], list)

        # 7. Reliability block
        self.assertIn("reliability", data)
        self.assertIsInstance(data["reliability"]["review_required"], bool)

        # 8. Lesions block
        self.assertIn("lesions", data)
        self.assertIn("activations", data["lesions"])

        # 9. Retinal structures block
        self.assertIn("structures", data)
        self.assertEqual(data["structures"]["optic_disc"]["status"], "not_implemented")
        self.assertEqual(data["structures"]["fovea"]["status"], "not_implemented")
        self.assertEqual(data["structures"]["vessels"]["status"], "not_implemented")
        self.assertEqual(data["structures"]["neovascularization"]["status"], "not_implemented")

        # 10. Explainability block
        self.assertIn("explainability", data)
        self.assertEqual(data["explainability"]["method"], "Grad-CAM")
        self.assertIsNotNone(data["explainability"]["overlay_png_base64"])

        # 11. Recommendation & Annotated report blocks
        self.assertIn("recommendation", data)
        self.assertIn("annotated_report", data)
        report = data["annotated_report"]
        self.assertIn("dr_grade", report)
        self.assertIn("dr_label", report)
        self.assertIn("referable_dr", report)
        self.assertIn("disclaimer", report)

    def test_predict_endpoint_invalid_file(self) -> None:
        response = self.client.post(
            "/predict",
            files={"image": ("test.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        self.assertEqual(response.status_code, 400)

    def test_predict_endpoint_oversized_file(self) -> None:
        oversized = b"0" * (21 * 1024 * 1024)
        response = self.client.post(
            "/predict",
            files={"image": ("huge.png", io.BytesIO(oversized), "image/png")},
        )
        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()
