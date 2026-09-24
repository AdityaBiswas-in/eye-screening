"""Composable, in-memory preprocessing for retinal fundus photographs.

The baseline deliberately separates raw image handling from tensor conversion and
normalization. It never writes to source files and leaves quality assessment to a
future dedicated module.
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from PIL import Image, ImageEnhance, ImageStat
from torchvision import transforms


IMAGE_SIZE = 384
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
_CROP_CACHE_KEY = "_retinal_field_crop_cache_key"
_CACHE_MISS = object()


class EnsureRGB:
    """Return an RGB copy, safely converting grayscale or other PIL modes."""

    def __call__(self, image: Image.Image) -> Image.Image:
        rgb_image = image.copy() if image.mode == "RGB" else image.convert("RGB")
        cache_key = getattr(image, _CROP_CACHE_KEY, None)
        if cache_key is not None:
            setattr(rgb_image, _CROP_CACHE_KEY, cache_key)
        return rgb_image


@dataclass
class RetinalFieldCrop:
    """Conservatively remove black borders using a low-intensity retinal mask.

    A small padding is retained around the detected field. Detection falls back
    to the complete RGB image when the mask is too small or unreliable.
    """

    background_threshold: int = 10
    minimum_foreground_fraction: float = 0.05
    padding_fraction: float = 0.02
    cache_size: int = 4096
    _bounds_cache: OrderedDict[str, tuple[int, int, int, int] | None] = field(
        default_factory=OrderedDict, init=False, repr=False
    )

    def _compute_crop_box(self, rgb_image: Image.Image) -> tuple[int, int, int, int] | None:
        """Compute the existing full-resolution crop bounds without caching pixels."""

        width, height = rgb_image.size
        pixels = np.asarray(rgb_image)
        foreground_mask = np.max(pixels, axis=2) > self.background_threshold

        minimum_pixels = max(1, int(width * height * self.minimum_foreground_fraction))
        foreground_count = np.count_nonzero(foreground_mask)
        if foreground_count < minimum_pixels:
            return None

        foreground_rows = np.flatnonzero(np.any(foreground_mask, axis=1))
        foreground_columns = np.flatnonzero(np.any(foreground_mask, axis=0))
        top, bottom = foreground_rows[0], foreground_rows[-1]
        left, right = foreground_columns[0], foreground_columns[-1]
        padding_x = max(1, round(width * self.padding_fraction))
        padding_y = max(1, round(height * self.padding_fraction))
        crop_box = (
            max(0, left - padding_x),
            max(0, top - padding_y),
            min(width, right + padding_x + 1),
            min(height, bottom + padding_y + 1),
        )
        return crop_box if crop_box[2] > crop_box[0] and crop_box[3] > crop_box[1] else None

    def _cache_crop_box(self, cache_key: str, crop_box: tuple[int, int, int, int] | None) -> None:
        """Store only bounded deterministic bounds; never store source or augmented pixels."""

        if self.cache_size <= 0:
            return
        self._bounds_cache[cache_key] = crop_box
        self._bounds_cache.move_to_end(cache_key)
        while len(self._bounds_cache) > self.cache_size:
            self._bounds_cache.popitem(last=False)

    def __call__(self, image: Image.Image) -> Image.Image:
        rgb_image = EnsureRGB()(image)
        cache_key = getattr(rgb_image, _CROP_CACHE_KEY, None)
        crop_box = _CACHE_MISS
        if isinstance(cache_key, str) and self.cache_size > 0:
            crop_box = self._bounds_cache.get(cache_key, _CACHE_MISS)
            if crop_box is not _CACHE_MISS:
                self._bounds_cache.move_to_end(cache_key)
        if crop_box is _CACHE_MISS:
            crop_box = self._compute_crop_box(rgb_image)
            if isinstance(cache_key, str):
                self._cache_crop_box(cache_key, crop_box)
        if crop_box is None:
            return rgb_image
        return rgb_image.crop(crop_box)


@dataclass(frozen=True)
class ConservativeIlluminationNormalization:
    """Optional deterministic bounded global exposure normalization.

    This is not CLAHE or local contrast enhancement. It is disabled by default
    and requires an ablation before becoming a baseline decision.
    """

    target_luminance: float = 128.0
    maximum_adjustment: float = 0.10

    def __call__(self, image: Image.Image) -> Image.Image:
        rgb_image = EnsureRGB()(image)
        mean_luminance = ImageStat.Stat(rgb_image.convert("L")).mean[0]
        if mean_luminance <= 0:
            return rgb_image
        requested_factor = self.target_luminance / mean_luminance
        lower = 1.0 - self.maximum_adjustment
        upper = 1.0 + self.maximum_adjustment
        return ImageEnhance.Brightness(rgb_image).enhance(
            min(max(requested_factor, lower), upper)
        )


def build_image_preprocessing(
    *, image_size: int = IMAGE_SIZE, enable_illumination_normalization: bool = False
) -> transforms.Compose:
    """Build deterministic raw-image preprocessing before tensor conversion."""

    if image_size <= 0:
        raise ValueError("image_size must be positive.")
    steps: list[Callable] = [
        EnsureRGB(),
        RetinalFieldCrop(),
        transforms.Resize((image_size, image_size), antialias=True),
    ]
    if enable_illumination_normalization:
        steps.insert(2, ConservativeIlluminationNormalization())
    return transforms.Compose(steps)


def build_train_transform(
    *, image_size: int = IMAGE_SIZE, enable_illumination_normalization: bool = False
) -> transforms.Compose:
    """Return baseline preprocessing plus moderate training-only augmentation."""

    return transforms.Compose(
        [
            build_image_preprocessing(
                image_size=image_size,
                enable_illumination_normalization=enable_illumination_normalization
            ),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=10),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def build_eval_transform(
    *, image_size: int = IMAGE_SIZE, enable_illumination_normalization: bool = False
) -> transforms.Compose:
    """Return deterministic validation and inference preprocessing."""

    return transforms.Compose(
        [
            build_image_preprocessing(
                image_size=image_size,
                enable_illumination_normalization=enable_illumination_normalization
            ),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
