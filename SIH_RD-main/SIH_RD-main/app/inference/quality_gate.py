"""Technical quality gate for SIH-26038 single-image inference.

Evaluates technical input safeguards before invoking neural network inference.

IMPORTANT: All rejection decisions here are engineering input safeguards
against images that are plainly unusable for any digital analysis. They are
NOT clinically validated gradability decisions, NOT clinical ungradability
thresholds, and NOT proof of clinical image quality.

The checks are intentionally conservative so that only obviously corrupt or
extreme inputs are rejected. Borderline images pass through and are handled
by the downstream clinical readability layer (which correctly reports
``not_validated``).
"""

from __future__ import annotations

from typing import Any, Dict, List
from PIL import Image

from training.quality import QualityFeatures


def evaluate_technical_quality(
    image: Image.Image,
    features: QualityFeatures,
) -> Dict[str, Any]:
    """Evaluate technical input validity before running neural network inference.

    Engineering safeguards only. Thresholds below are NOT clinical gradability
    thresholds. They catch inputs that no image-analysis algorithm could
    meaningfully process (microscopic dimensions, blank images, fully saturated
    frames, fully dark frames).

    Returns a structured dictionary:
    {
        "decision": "accept" | "reject",
        "technical_valid": bool,
        "issues": list[str],
        "recapture_required": bool,
        "action": "continue_with_caution" | "recapture",
        "gradability_stage": "technical_quality_failure" | "passed_technical_checks",
        "reason": str | None
    }
    """
    issues: List[str] = []

    # 1. Engineering check: Minimum pixel dimensions required for spatial processing.
    #    A 16×16 image cannot support any retinal analysis.
    MIN_DIM = 16
    if features.width < MIN_DIM or features.height < MIN_DIM:
        issues.append("unusable_image_dimensions")

    # 2. Engineering check: Retinal field coverage (no foreground detected at all).
    #    Zero coverage means every pixel is below the background threshold — the
    #    image contains no information.
    if features.retinal_field_coverage <= 0.0:
        issues.append("no_retinal_field_detected")

    # 3. Engineering check: Completely dark or blank image.
    #    95th-percentile luminance ≤ 10 means the image is essentially pure black.
    if features.luminance_p95 <= 10.0:
        issues.append("blank_or_constant_dark_image")

    # 4. Engineering check: Severe overexposure.
    #    > 80% of pixels at saturation (≥ 245) — image is overwhelmingly white/washed
    #    out. No retinal structure is visible. This is NOT a clinical threshold.
    if features.saturated_pixel_fraction > 0.80:
        issues.append("severe_overexposure")

    # 5. Engineering check: Severe underexposure.
    #    > 90% of pixels at background level (≤ 10) — image is overwhelmingly dark.
    #    No retinal structure is visible. This is NOT a clinical threshold.
    if features.dark_pixel_fraction > 0.90:
        issues.append("severe_underexposure")

    is_valid = len(issues) == 0

    if not is_valid:
        return {
            "decision": "reject",
            "technical_valid": False,
            "issues": issues,
            "recapture_required": True,
            "action": "recapture",
            "gradability_stage": "technical_quality_failure",
            "reason": (
                "Engineering input safeguard: uploaded image is technically unusable "
                f"({', '.join(issues)}). Submit a valid fundus photograph. "
                "This is NOT a clinical ungradability determination."
            ),
        }

    return {
        "decision": "accept",
        "technical_valid": True,
        "issues": [],
        "recapture_required": False,
        "action": "continue_with_caution",
        "gradability_stage": "passed_technical_checks",
        "reason": None,
    }
