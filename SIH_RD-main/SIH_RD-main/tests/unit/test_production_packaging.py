"""Small regression tests for production packaging configuration."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from app.inference.model_loader import DEFAULT_CHECKPOINT, resolve_checkpoint_path
from app.main import health


class ProductionPackagingTest(unittest.TestCase):
    def test_model_path_environment_override(self) -> None:
        with patch.dict(os.environ, {"MODEL_PATH": "/models/custom.pt"}):
            self.assertEqual(resolve_checkpoint_path(), Path("/models/custom.pt"))
        self.assertEqual(resolve_checkpoint_path(), DEFAULT_CHECKPOINT)

    def test_health_endpoint_is_available_before_startup(self) -> None:
        response = health()
        self.assertEqual(response["status"], "ok")
        self.assertIn("model_loaded", response)

    def test_docker_configuration_uses_existing_api_and_healthcheck(self) -> None:
        dockerfile = (PROJECT_ROOT / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("uvicorn", dockerfile)
        self.assertIn("app.main:app", dockerfile)
        self.assertIn("/health", dockerfile)
        self.assertIn("checkpoints/e9_full_referable_best.pt", dockerfile)


if __name__ == "__main__":
    unittest.main()
