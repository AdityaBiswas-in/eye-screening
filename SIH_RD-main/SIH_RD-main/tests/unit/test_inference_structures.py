import asyncio
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from starlette.datastructures import Headers, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

import app.main as api_main

class InferenceStructuresTest(unittest.TestCase):
    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_predict_returns_unimplemented_structures_with_blockers(self, mock_gradcam, mock_model) -> None:
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
            "output": {
                "dr_logits": torch.zeros(1, 5),
                "referable_logits": torch.zeros(1, 1),
                "ma_logits": torch.zeros(1, 1, 384, 384),
                "he_logits": torch.zeros(1, 1, 384, 384),
                "ex_logits": torch.zeros(1, 1, 384, 384),
                "se_logits": torch.zeros(1, 1, 384, 384),
            },
        }
        api_main.DEVICE = torch.device("cpu")
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        structures = result["structures"]
        
        for key in ["optic_disc", "fovea", "vessels", "neovascularization"]:
            self.assertIn(key, structures)
            self.assertEqual(structures[key]["status"], "not_implemented")
            self.assertIn("blocker", structures[key])

        # Optic disc: data IS available (IDRiD masks exist locally)
        self.assertTrue(structures["optic_disc"]["data_available"])
        # Fovea: data is NOT available locally
        self.assertFalse(structures["fovea"]["data_available"])

    @patch("app.main.MODEL")
    @patch("app.main.GRADCAM")
    def test_predict_success_has_clinical_readability_not_validated(self, mock_gradcam, mock_model) -> None:
        """Successful predictions must include clinical_readability.status = not_validated."""
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
            "output": {
                "dr_logits": torch.zeros(1, 5),
                "referable_logits": torch.zeros(1, 1),
                "ma_logits": torch.zeros(1, 1, 384, 384),
                "he_logits": torch.zeros(1, 1, 384, 384),
                "ex_logits": torch.zeros(1, 1, 384, 384),
                "se_logits": torch.zeros(1, 1, 384, 384),
            },
        }
        api_main.DEVICE = torch.device("cpu")
        api_main.MODEL_METADATA = {"experiment": "test", "checkpoint": "test.pt", "epoch": 1, "device": "cpu"}

        result = asyncio.run(api_main.predict(upload))
        self.assertEqual(result["status"], "reportable")
        # Clinical readability is always not_validated (no verified labels)
        iq = result["image_quality"]
        self.assertIn("clinical_readability", iq)
        self.assertEqual(iq["clinical_readability"]["status"], "not_validated")
        self.assertIsNone(iq["clinical_readability"]["gradable"])
        self.assertEqual(iq["gradability_decision"], "not_assessed")

if __name__ == "__main__":
    unittest.main()
