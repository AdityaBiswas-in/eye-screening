"""Clinical readability assessment protocol for SIH-26038.

IMPORTANT: This module does NOT perform clinically validated gradability assessment.

No verified clinical gradability labels exist in the local project data for
any dataset (APTOS, IDRiD, DRIVE). Without labelled training data and independent
clinical validation, it is not scientifically valid to claim a clinical
gradability decision.

This module:
  1. Documents the clinical readability dimensions that should be assessed.
  2. Reports measured image features that are related to gradability.
  3. Always returns status = "not_validated" to prevent fabricated clinical claims.
  4. Defines the annotation protocol that would be required for a real gradability
     classifier.

It is explicitly labelled: EXPERIMENTAL / NOT CLINICALLY VALIDATED.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from training.quality import QualityFeatures


# ---------------------------------------------------------------------------
# Clinical readability dimensions (research literature-derived, not validated)
# ---------------------------------------------------------------------------

READABILITY_DIMENSIONS = [
    "focus_sharpness",
    "illumination_adequacy",
    "retinal_field_coverage",
    "overexposure",
    "underexposure",
    "artifact_presence",
    "optic_disc_visibility",
    "macular_foveal_visibility",
]

# ---------------------------------------------------------------------------
# Annotation protocol for future clinical gradability labels
# ---------------------------------------------------------------------------

ANNOTATION_PROTOCOL = {
    "required_labels": ["gradable", "ungradable", "uncertain"],
    "label_source": "independent_ophthalmologist_consensus",
    "minimum_reviewers": 2,
    "agreement_method": "majority_vote_with_adjudication",
    "dimensions_to_annotate": READABILITY_DIMENSIONS,
    "minimum_image_count": 500,
    "required_quality_variation": True,
    "blinding_required": True,
    "status": "NOT_COLLECTED",
    "note": (
        "This annotation protocol has not been executed. "
        "No verified gradability labels exist in the local project. "
        "Training a gradability classifier requires this data first."
    ),
}


def assess_clinical_readability(
    features: QualityFeatures,
) -> Dict[str, Any]:
    """Assess clinical readability dimensions from measured image features.

    This function maps measured quality features to readability-relevant
    observations. It does NOT produce a clinical gradability decision.

    All numeric observations are informational only. No threshold separates
    gradable from ungradable because no verified clinical threshold has
    been established for this project.

    Returns
    -------
    dict with structure:
        {
            "status": "not_validated",
            "gradable": null,
            "observations": {...},
            "annotation_protocol": {...},
            "note": "..."
        }
    """
    # Informational observations — not clinical decisions
    observations: Dict[str, Any] = {
        "focus": {
            "sharpness_laplacian_variance": features.sharpness_laplacian_variance,
            "note": (
                "Higher variance suggests more high-frequency content. "
                "No validated threshold separates adequate from inadequate focus."
            ),
        },
        "illumination": {
            "mean_luminance": features.mean_luminance,
            "luminance_p05": features.luminance_p05,
            "luminance_p95": features.luminance_p95,
            "illumination_nonuniformity": features.illumination_nonuniformity,
            "note": (
                "Descriptive illumination statistics only. "
                "No validated threshold separates adequate from inadequate illumination."
            ),
        },
        "retinal_field": {
            "retinal_field_coverage": features.retinal_field_coverage,
            "background_pixel_fraction": features.background_pixel_fraction,
            "note": (
                "Fraction of pixels above background threshold. "
                "No validated field-adequacy threshold."
            ),
        },
        "overexposure_indicator": {
            "saturated_pixel_fraction": features.saturated_pixel_fraction,
            "note": (
                "Fraction of pixels at or above saturation threshold (245). "
                "Very high fractions may indicate overexposure. "
                "No validated clinical threshold."
            ),
        },
        "underexposure_indicator": {
            "dark_pixel_fraction": features.dark_pixel_fraction,
            "note": (
                "Fraction of pixels at or below background threshold (10). "
                "Very high fractions may indicate underexposure. "
                "No validated clinical threshold."
            ),
        },
    }

    return {
        "status": "not_validated",
        "gradable": None,
        "observations": observations,
        "missing_data": {
            "clinical_gradability_labels": "NOT_COLLECTED",
            "optic_disc_visibility_labels": "NOT_COLLECTED",
            "macular_foveal_visibility_labels": "NOT_COLLECTED",
            "artifact_labels": "NOT_COLLECTED",
        },
        "annotation_protocol_required": ANNOTATION_PROTOCOL,
        "note": (
            "Clinical readability assessment is NOT VALIDATED. "
            "No verified clinical gradability labels exist in the local project. "
            "The observations above are descriptive image features only. "
            "A clinical gradability classifier requires annotated training data "
            "from verified ophthalmologist review. "
            "This module must not be used to make screening decisions."
        ),
    }
