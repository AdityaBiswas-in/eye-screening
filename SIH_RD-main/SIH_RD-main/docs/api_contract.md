# Single Inference API Contract

## Endpoint

The deployed backend will expose one primary inference endpoint:

```text
POST /predict
```

It accepts one fundus image and returns the complete screening result in a single response. Quality assessment, grading, uncertainty, evidence extraction, and explanation are internal stages; they are not separate public inference endpoints. This contract is implemented by the FastAPI research prototype and remains screening support, not clinical diagnosis.

## Request

Use `multipart/form-data` with one required file field:

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `image` | fundus image file | Yes | One color fundus photograph for screening. |

Accepted media types, upload limits, authentication, and request identifiers are TODO for deployment design. Malformed, unsupported, or unreadable uploads should receive a transport/request error and must not be interpreted as a screening result.

## Reportable response

A reportable response represents a complete result for the submitted image. E9 uses a direct referable head at a frozen validation-selected threshold and also reports the grade-derived decision; disagreement is never overwritten and requires review.

```json
{
  "status": "reportable",
  "model": {
    "experiment": "e9_full_referable",
    "experiment_family": "E9",
    "checkpoint_id": "e9_full_referable_best.pt",
    "checkpoint_epoch": 0,
    "image_size": 384,
    "device": "cpu"
  },
  "image_quality": {
    "status": "features_available",
    "gradable": null,
    "decision": "not_assessed",
    "action": "continue_with_caution",
    "recapture_required": false,
    "enhancement": {
      "clahe": false,
      "illumination_normalization": false,
      "denoising": false
    },
    "focus": {},
    "illumination": {},
    "field_of_view": {},
    "features": {}
  },
  "dr": {
    "grade": 0,
    "label": "No DR",
    "class_probabilities": []
  },
  "referable_dr": {},
  "uncertainty": {
    "conformal_prediction_set": [],
    "conformal_threshold": 0.812996,
    "calibration_temperature": 2.069366
  },
  "lesions": {
    "status": "experimental_map_summary",
    "named_activations": {
      "microaneurysm": 0.0,
      "hemorrhage": 0.0,
      "hard_exudate": 0.0,
      "soft_exudate": 0.0
    }
  },
  "structures": {"optic_disc": {"status": "not_implemented"}},
  "explainability": {
    "method": "Grad-CAM",
    "status": "available",
    "overlay_png_base64": "..."
  },
  "reliability": {},
  "recommendation_status": "screening_result_available",
  "recommendation": "Screening result available for clinical review; this output is not a diagnosis.",
  "deployment": {}
}
```

Temperature scaling changes reported probabilities, not the model architecture or argmax logits. The conformal and evidence thresholds were frozen from E9 validation work; coverage and gate behavior can change under domain shift. Explanations are supportive model attribution, not lesion localization, a diagnosis, or a replacement for clinical review.

The grade-derived referable status uses the project protocol assumption `grade >=
2`; it is not represented as a universal clinical definition. The direct E9
referable head is reported separately, including any disagreement.

## Current quality-assessment limitation

The deployed route computes deterministic quality features but has no
validated gradability threshold. It therefore does not automatically produce
an `ungradable` response or reject a decodable image on quality grounds.
`image_quality.gradable` remains `null` and `image_quality.decision` remains
`not_assessed`. A future ungradable workflow requires verified quality labels,
threshold calibration, and validation before it can be enabled.

Malformed, unsupported, or unreadable uploads return a controlled HTTP 400
error and are not interpreted as a screening result.
