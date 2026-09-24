"""Deterministic image-level quality features for retinal photographs.

These are measurable image properties, not clinical gradability labels or image
rejection decisions. Their relationship to screening performance must be studied
and calibrated with appropriate data before clinical-facing use.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
from PIL import Image


BACKGROUND_THRESHOLD = 10
SATURATION_THRESHOLD = 245


@dataclass(frozen=True)
class QualityFeatures:
    """Measured, finite image properties after safe conversion to RGB.

    ``sharpness_laplacian_variance`` measures high-frequency spatial variation
    using a discrete luminance Laplacian. It is a focus/sharpness proxy, not
    proof of clinical image gradability. Coverage and pixel fractions describe
    intensity distributions; they do not identify capture artifacts or disease.
    """

    width: int
    height: int
    aspect_ratio: float
    rgb_mode: str
    sharpness_laplacian_variance: float
    retinal_field_coverage: float
    mean_luminance: float
    luminance_stddev: float
    luminance_p05: float
    luminance_p95: float
    illumination_nonuniformity: float
    dark_pixel_fraction: float
    saturated_pixel_fraction: float
    background_pixel_fraction: float

    def to_dict(self) -> dict[str, int | float | str]:
        """Return a serialization-friendly representation."""

        return asdict(self)


def _ensure_rgb_array(image: Image.Image) -> tuple[Image.Image, np.ndarray]:
    """Return an RGB copy and its uint8 array without mutating the input image."""

    rgb_image = image.copy() if image.mode == "RGB" else image.convert("RGB")
    return rgb_image, np.asarray(rgb_image, dtype=np.uint8)


def _luminance(rgb_array: np.ndarray) -> np.ndarray:
    """Compute Rec. 709 luminance in the 0–255 source-image range."""

    rgb = rgb_array.astype(np.float32)
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def _laplacian_variance(luminance: np.ndarray) -> float:
    """Return variance of a 4-neighbour discrete luminance Laplacian.

    This conventional focus proxy is zero for a spatially constant image. It
    does not distinguish blur from all other sources of high-frequency detail.
    """

    if luminance.shape[0] < 3 or luminance.shape[1] < 3:
        return 0.0
    center = luminance[1:-1, 1:-1]
    laplacian = (
        4.0 * center
        - luminance[:-2, 1:-1]
        - luminance[2:, 1:-1]
        - luminance[1:-1, :-2]
        - luminance[1:-1, 2:]
    )
    return float(np.var(laplacian, dtype=np.float64))


def _illumination_nonuniformity(luminance: np.ndarray) -> float:
    """Return standard deviation of four quadrant mean luminances.

    This is a coarse, deterministic uneven-illumination indicator. It is not a
    diagnostic measure and does not identify the source of brightness variation.
    """

    height, width = luminance.shape
    midpoint_y, midpoint_x = max(1, height // 2), max(1, width // 2)
    quadrants = (
        luminance[:midpoint_y, :midpoint_x],
        luminance[:midpoint_y, midpoint_x:],
        luminance[midpoint_y:, :midpoint_x],
        luminance[midpoint_y:, midpoint_x:],
    )
    means = [float(np.mean(quadrant)) for quadrant in quadrants if quadrant.size]
    return float(np.std(means, dtype=np.float64)) if means else 0.0


def compute_quality_features(image: Image.Image) -> QualityFeatures:
    """Measure deterministic quality features for a PIL image.

    Grayscale images are safely converted to RGB. All returned numeric values
    are finite for valid PIL images, including constant, dark, square, and
    unusual-aspect-ratio inputs. No image file is read, changed, or written.
    """

    orig_width, orig_height = image.size

    # Scale high-resolution inputs (max 1024px) for fast, low-memory feature calculation
    max_dim = max(orig_width, orig_height)
    if max_dim > 1024:
        scale = 1024.0 / max_dim
        new_size = (max(1, int(orig_width * scale)), max(1, int(orig_height * scale)))
        eval_image = image.resize(new_size, Image.Resampling.BILINEAR)
    else:
        eval_image = image

    rgb_image, rgb_array = _ensure_rgb_array(eval_image)
    luminance = _luminance(rgb_array)
    field_mask = np.max(rgb_array, axis=2) > BACKGROUND_THRESHOLD
    dark_mask = luminance <= BACKGROUND_THRESHOLD
    saturated_mask = luminance >= SATURATION_THRESHOLD

    return QualityFeatures(
        width=orig_width,
        height=orig_height,
        aspect_ratio=float(orig_width / orig_height),
        rgb_mode=image.mode,
        sharpness_laplacian_variance=_laplacian_variance(luminance),
        retinal_field_coverage=float(np.mean(field_mask)),
        mean_luminance=float(np.mean(luminance)),
        luminance_stddev=float(np.std(luminance, dtype=np.float64)),
        luminance_p05=float(np.percentile(luminance, 5)),
        luminance_p95=float(np.percentile(luminance, 95)),
        illumination_nonuniformity=_illumination_nonuniformity(luminance),
        dark_pixel_fraction=float(np.mean(dark_mask)),
        saturated_pixel_fraction=float(np.mean(saturated_mask)),
        background_pixel_fraction=float(1.0 - np.mean(field_mask)),
    )
