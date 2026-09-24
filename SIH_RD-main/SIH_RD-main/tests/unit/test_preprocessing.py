"""Unit tests for reusable in-memory retinal preprocessing."""

from __future__ import annotations

import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

import torch
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from training.preprocessing import (
    IMAGE_SIZE,
    RetinalFieldCrop,
    build_image_preprocessing,
    build_eval_transform,
    build_train_transform,
)


class PreprocessingTest(unittest.TestCase):
    @staticmethod
    def _fundus_like_image(size: tuple[int, int] = (640, 400)) -> Image.Image:
        image = Image.new("RGB", size, "black")
        field = Image.new("RGB", (size[0] - 80, size[1] - 80), (90, 55, 35))
        image.paste(field, (40, 40))
        return image

    def _assert_valid_tensor(self, image: Image.Image) -> None:
        tensor = build_eval_transform()(image)
        self.assertEqual(tuple(tensor.shape), (3, IMAGE_SIZE, IMAGE_SIZE))
        self.assertEqual(tensor.dtype, torch.float32)
        self.assertTrue(torch.isfinite(tensor).all().item())

    @staticmethod
    def _previous_retinal_field_crop(image: Image.Image) -> Image.Image:
        """Reference the former coordinate-array crop implementation for regression checks."""

        crop = RetinalFieldCrop()
        rgb_image = image.copy() if image.mode == "RGB" else image.convert("RGB")
        width, height = rgb_image.size
        pixels = rgb_image.load()
        foreground_x: list[int] = []
        foreground_y: list[int] = []
        for y in range(height):
            for x in range(width):
                if max(pixels[x, y]) > crop.background_threshold:
                    foreground_x.append(x)
                    foreground_y.append(y)

        minimum_pixels = max(1, int(width * height * crop.minimum_foreground_fraction))
        if len(foreground_x) < minimum_pixels:
            return rgb_image
        left, right = min(foreground_x), max(foreground_x)
        top, bottom = min(foreground_y), max(foreground_y)
        padding_x = max(1, round(width * crop.padding_fraction))
        padding_y = max(1, round(height * crop.padding_fraction))
        crop_box = (
            max(0, left - padding_x),
            max(0, top - padding_y),
            min(width, right + padding_x + 1),
            min(height, bottom + padding_y + 1),
        )
        return rgb_image if crop_box[2] <= crop_box[0] or crop_box[3] <= crop_box[1] else rgb_image.crop(crop_box)

    def test_rgb_grayscale_aspect_ratio_and_square_inputs(self) -> None:
        self._assert_valid_tensor(self._fundus_like_image((900, 200)))
        self._assert_valid_tensor(self._fundus_like_image((384, 384)))
        self._assert_valid_tensor(Image.new("L", (500, 300), color=100))

    def test_configurable_resize_preserves_crop_before_resize(self) -> None:
        canonical_steps = build_image_preprocessing().transforms
        development_steps = build_image_preprocessing(image_size=224).transforms
        self.assertEqual(canonical_steps[2].size, (IMAGE_SIZE, IMAGE_SIZE))
        self.assertEqual(development_steps[2].size, (224, 224))
        self.assertIsInstance(canonical_steps[1], RetinalFieldCrop)
        self.assertIsInstance(development_steps[1], RetinalFieldCrop)

    def test_mostly_dark_image_safely_falls_back(self) -> None:
        image = Image.new("RGB", (200, 100), "black")
        image.putpixel((100, 50), (255, 255, 255))
        self.assertEqual(RetinalFieldCrop()(image).size, image.size)
        self._assert_valid_tensor(image)

    def test_retinal_field_crop_detects_rgb_foreground_with_padding(self) -> None:
        image = Image.new("RGB", (10, 8), "black")
        for y in range(1, 3):
            for x in range(2, 5):
                image.putpixel((x, y), (11, 0, 0))

        cropped = RetinalFieldCrop()(image)

        # The mask matches the original per-pixel max(channel) > threshold rule.
        # One-pixel padding produces crop box (1, 0, 6, 4).
        self.assertEqual(cropped.size, (5, 4))
        self.assertEqual(cropped.getpixel((1, 1)), (11, 0, 0))

    def test_retinal_field_crop_matches_previous_coordinate_bounds(self) -> None:
        wide_field = Image.new("RGB", (20, 10), "black")
        wide_field.paste(Image.new("RGB", (14, 6), (0, 11, 0)), (3, 2))
        sparse_field = Image.new("RGB", (12, 12), "black")
        for coordinate in ((2, 3), (9, 8), (4, 10), (7, 1)):
            sparse_field.putpixel(coordinate, (0, 0, 11))

        for image in (wide_field, sparse_field, Image.new("RGB", (10, 10), "black")):
            expected = self._previous_retinal_field_crop(image)
            actual = RetinalFieldCrop()(image)
            self.assertEqual(actual.size, expected.size)
            self.assertEqual(actual.tobytes(), expected.tobytes())

    def test_retinal_field_crop_cached_bounds_match_uncached_crop(self) -> None:
        image = self._fundus_like_image((120, 80))
        cached_crop = RetinalFieldCrop()
        uncached_crop = RetinalFieldCrop()
        first = image.copy()
        repeated = image.copy()
        setattr(first, "_retinal_field_crop_cache_key", "synthetic-image")
        setattr(repeated, "_retinal_field_crop_cache_key", "synthetic-image")

        expected = uncached_crop(image)
        first_result = cached_crop(first)
        repeated_result = cached_crop(repeated)

        self.assertEqual(first_result.size, expected.size)
        self.assertEqual(first_result.tobytes(), expected.tobytes())
        self.assertEqual(repeated_result.size, expected.size)
        self.assertEqual(repeated_result.tobytes(), expected.tobytes())
        self.assertEqual(len(cached_crop._bounds_cache), 1)

    def test_evaluation_is_deterministic_and_training_is_stochastic(self) -> None:
        image = self._fundus_like_image()
        evaluation = build_eval_transform()
        self.assertTrue(torch.equal(evaluation(image), evaluation(image)))
        training = build_train_transform()
        outputs = [training(image) for _ in range(5)]
        self.assertTrue(any(not torch.equal(outputs[0], output) for output in outputs[1:]))

    def test_transform_never_modifies_source_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_path = Path(temporary_directory) / "source.png"
            self._fundus_like_image().save(image_path)
            before = hashlib.sha256(image_path.read_bytes()).hexdigest()
            with Image.open(image_path) as source_image:
                _ = build_eval_transform()(source_image)
            after = hashlib.sha256(image_path.read_bytes()).hexdigest()
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main(verbosity=2)
