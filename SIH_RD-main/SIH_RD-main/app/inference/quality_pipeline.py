"""Safe, opt-in quality-aware routing for one-image inference.

No clinical quality threshold is defined here. By default the router preserves
the submitted pixels and reports deterministic measurements only.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageFilter

from training.quality import QualityFeatures, compute_quality_features


@dataclass(frozen=True)
class EnhancementConfig:
    """Experimental enhancement switches; all remain disabled by default."""

    illumination_normalization: bool = False
    denoise: bool = False
    clahe: bool = False


def _bounded_illumination(image: Image.Image) -> Image.Image:
    """Apply the existing bounded global illumination operation in memory."""

    from training.preprocessing import ConservativeIlluminationNormalization

    return ConservativeIlluminationNormalization()(image)


def _experimental_clahe(image: Image.Image) -> Image.Image:
    """Apply a small tile-local CLAHE experiment to luminance only.

    This is disabled by default because it has not been ablated for E9 and can
    change lesion appearance. It is not presented as a validated enhancement.
    """

    ycbcr = image.convert("YCbCr")
    array = np.asarray(ycbcr, dtype=np.uint8).copy()
    luminance = array[..., 0]
    height, width = luminance.shape
    tiles_y, tiles_x = 8, 8
    clip_limit = 2.0
    for y0 in range(0, height, max(1, height // tiles_y)):
        for x0 in range(0, width, max(1, width // tiles_x)):
            y1 = min(height, y0 + max(1, height // tiles_y))
            x1 = min(width, x0 + max(1, width // tiles_x))
            tile = luminance[y0:y1, x0:x1]
            histogram = np.bincount(tile.ravel(), minlength=256).astype(np.float64)
            limit = max(1, int(clip_limit * tile.size / 256))
            excess = np.maximum(histogram - limit, 0).sum()
            histogram = np.minimum(histogram, limit)
            histogram += excess / 256
            lookup = np.clip(np.round(255 * np.cumsum(histogram) / histogram.sum()), 0, 255).astype(np.uint8)
            luminance[y0:y1, x0:x1] = lookup[tile]
    array[..., 0] = luminance
    return Image.fromarray(array, mode="YCbCr").convert("RGB")


def prepare_quality_aware_image(
    image: Image.Image, config: EnhancementConfig = EnhancementConfig()
) -> tuple[Image.Image, QualityFeatures, dict[str, object]]:
    """Measure quality and optionally apply explicitly selected experiments.

    No measurement produces an ungradable decision: that needs verified quality
    labels and a validated threshold. The returned state keeps that limitation
    visible to the API consumer.
    """

    rgb = image.convert("RGB")
    features = compute_quality_features(rgb)
    enhanced = rgb
    applied: list[str] = []
    if config.illumination_normalization:
        enhanced = _bounded_illumination(enhanced)
        applied.append("bounded_illumination_normalization")
    if config.denoise:
        enhanced = enhanced.filter(ImageFilter.MedianFilter(size=3))
        applied.append("experimental_median_denoise")
    if config.clahe:
        enhanced = _experimental_clahe(enhanced)
        applied.append("experimental_clahe_luminance")
    return enhanced, features, {
        "status": "enhancement_applied" if applied else "features_available",
        "decision": "not_assessed",
        "gradable": None,
        "enhancement_applied": applied,
        "review_required": False,
        "recapture_recommended": False,
        "note": "No validated gradability threshold is configured; the image is not automatically rejected.",
    }
