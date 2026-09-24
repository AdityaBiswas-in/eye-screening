"""Tests for deterministic, non-diagnostic image-quality features."""

from __future__ import annotations

import hashlib
import math
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from training.quality import compute_quality_features


class QualityFeaturesTest(unittest.TestCase):
    @staticmethod
    def _rgb_image(size: tuple[int, int]) -> Image.Image:
        image = Image.new("RGB", size, "black")
        image.paste(Image.new("RGB", (size[0] // 2, size[1] // 2), (120, 80, 40)), (0, 0))
        return image

    def _assert_finite_features(self, image: Image.Image) -> None:
        result = compute_quality_features(image)
        self.assertEqual(result.rgb_mode, "RGB")
        self.assertGreaterEqual(result.retinal_field_coverage, 0.0)
        self.assertLessEqual(result.retinal_field_coverage, 1.0)
        for value in result.to_dict().values():
            if isinstance(value, float):
                self.assertTrue(math.isfinite(value))

    def test_rgb_grayscale_square_and_wide_images(self) -> None:
        self._assert_finite_features(self._rgb_image((100, 100)))
        self._assert_finite_features(self._rgb_image((400, 80)))
        self._assert_finite_features(Image.new("L", (80, 160), 100))

    def test_dark_constant_image_and_repeatability(self) -> None:
        image = Image.new("RGB", (64, 64), "black")
        first = compute_quality_features(image)
        self.assertEqual(first, compute_quality_features(image))
        self.assertEqual(first.sharpness_laplacian_variance, 0.0)
        self._assert_finite_features(image)

    def test_source_file_is_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_path = Path(temporary_directory) / "source.png"
            self._rgb_image((120, 90)).save(image_path)
            before = hashlib.sha256(image_path.read_bytes()).hexdigest()
            with Image.open(image_path) as image:
                _ = compute_quality_features(image)
            self.assertEqual(before, hashlib.sha256(image_path.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main(verbosity=2)
