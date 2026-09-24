"""FastAPI application for SIH-26038."""

from __future__ import annotations

import base64
import gc
import io
import os
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

from app.inference.gradcam import GradCAM
from app.inference.model_loader import load_model
from app.inference.quality_gate import evaluate_technical_quality
from app.inference.quality_pipeline import prepare_quality_aware_image
from app.inference.clinical_readability import assess_clinical_readability
from app.inference.optic_disc import get_api_response as optic_disc_api_response
from app.inference.predictor import (
    DR_LABELS,
    IMAGE_SIZE,
    LESION_LABELS,
    LESION_TYPES,
    build_inference_transform,
)

app = FastAPI(
    title="SIH-26038 Diabetic Retinopathy Screening API",
    version="0.1.0",
)


MODEL = None
MODEL_METADATA = None
DEVICE = None
GRADCAM = None
INFERENCE_TRANSFORM = build_inference_transform()


REFERABLE_THRESHOLD = 0.05
REFERABLE_THRESHOLD_SOURCE = (
    "E9 pooled validation selection"
)

# Frozen E9 post-hoc validation parameters.
CALIBRATION_TEMPERATURE = 2.069366
CONFORMAL_THRESHOLD = 0.812996
EVIDENCE_THRESHOLD = 0.238935
CONFORMAL_SOURCE = (
    "E9 pooled validation calibration"
)
EVIDENCE_THRESHOLD_SOURCE = (
    "E9 pooled validation calibration"
)


@app.on_event("startup")
def startup_event():
    global MODEL
    global MODEL_METADATA
    global DEVICE
    global GRADCAM

    MODEL, MODEL_METADATA = load_model()
    DEVICE = torch.device(MODEL_METADATA["device"])
    if DEVICE.type == "cpu":
        num_threads = int(os.environ.get("TORCH_NUM_THREADS", "1"))
        torch.set_num_threads(num_threads)
    GRADCAM = GradCAM(MODEL)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "gradcam_loaded": GRADCAM is not None,
        "model_experiment": (
            MODEL_METADATA["experiment"]
            if MODEL_METADATA
            else None
        ),
        "checkpoint_epoch": (
            MODEL_METADATA["epoch"]
            if MODEL_METADATA
            else None
        ),
        "device": str(DEVICE) if DEVICE else None,
    }


def _png_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(
        buffer.getvalue()
    ).decode("ascii")


def _create_gradcam_overlay(
    pil_image: Image.Image,
    heatmap: torch.Tensor,
) -> str:
    """Create a model-attribution overlay, not a lesion map."""

    base = pil_image.resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    )

    heatmap = heatmap.detach().cpu()

    if heatmap.ndim == 4:
        heatmap = heatmap[0, 0]
    elif heatmap.ndim == 3:
        heatmap = heatmap[0]

    heatmap_array = (
        heatmap.clamp(0.0, 1.0)
        .mul(255.0)
        .to(torch.uint8)
        .numpy()
    )

    heatmap_image = Image.fromarray(
        heatmap_array
    ).convert("L")

    red_map = Image.new(
        "RGBA",
        (IMAGE_SIZE, IMAGE_SIZE),
        (255, 0, 0, 0),
    )

    alpha = heatmap_image.point(
        lambda value: int(value * 0.55)
    )

    red_map.putalpha(alpha)

    overlay = base.convert("RGBA")
    overlay.alpha_composite(red_map)

    return _png_base64(
        overlay.convert("RGB")
    )


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
):
    print("[PREDICT] request_received", flush=True)

    if MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded.",
        )

    if GRADCAM is None:
        raise HTTPException(
            status_code=503,
            detail="Grad-CAM is not loaded.",
        )

    if not image.content_type or not image.content_type.startswith(
        "image/"
    ):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image.",
        )

    try:
        image_bytes = await image.read()
        print(f"[PREDICT] image_bytes_read: {len(image_bytes)} bytes", flush=True)

        # Guard: reject uploads larger than 20 MB to prevent OOM.
        _MAX_UPLOAD_BYTES = 20 * 1024 * 1024
        if len(image_bytes) > _MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"Image upload exceeds the {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB "
                    "size limit. Submit a smaller or re-compressed image."
                ),
            )

        pil_image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")
        print(f"[PREDICT] image_decoded: format={pil_image.format} size={pil_image.size} mode={pil_image.mode}", flush=True)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image: {exc}",
        ) from exc

    # ---------------------------------------------------------
    # Image Quality Assessment
    #
    # These are deterministic image measurements only.
    # They are NOT clinical gradability labels.
    # ---------------------------------------------------------

    print("[PREDICT] quality_processing_start", flush=True)
    model_image, quality_features, quality_status = prepare_quality_aware_image(pil_image)
    print("[PREDICT] quality_processing_complete", flush=True)

    # ---------------------------------------------------------
    # Technical Quality Gate (Engineering Input Safeguard)
    # ---------------------------------------------------------
    gate_result = evaluate_technical_quality(model_image, quality_features)

    clinical_readability = assess_clinical_readability(quality_features)
    print(f"[PREDICT] technical_gate_complete: valid={gate_result['technical_valid']}", flush=True)

    if not gate_result["technical_valid"]:
        return {
            "status": "rejected",
            "model": {
                "experiment": MODEL_METADATA["experiment"],
                "experiment_family": "E9",
                "checkpoint_id": Path(MODEL_METADATA["checkpoint"]).name,
                "checkpoint_epoch": MODEL_METADATA["epoch"],
                "image_size": IMAGE_SIZE,
                "device": str(DEVICE),
            },
            "image_quality": {
                "technical": {
                    "decision": gate_result["decision"],
                    "valid": gate_result["technical_valid"],
                    "issues": gate_result["issues"],
                    "action": gate_result["action"],
                    "gradability_stage": gate_result["gradability_stage"],
                    "reason": gate_result["reason"],
                    "focus": {
                        "sharpness_laplacian_variance": quality_features.sharpness_laplacian_variance,
                    },
                    "illumination": {
                        "mean_luminance": quality_features.mean_luminance,
                        "luminance_stddev": quality_features.luminance_stddev,
                        "luminance_p05": quality_features.luminance_p05,
                        "luminance_p95": quality_features.luminance_p95,
                        "illumination_nonuniformity": quality_features.illumination_nonuniformity,
                        "dark_pixel_fraction": quality_features.dark_pixel_fraction,
                        "saturated_pixel_fraction": quality_features.saturated_pixel_fraction,
                    },
                    "field_of_view": {
                        "retinal_field_coverage": quality_features.retinal_field_coverage,
                        "background_pixel_fraction": quality_features.background_pixel_fraction,
                    },
                },
                "clinical_readability": clinical_readability,
                "gradability_decision": "technical_quality_failure",
                "gradable": False,
                "recapture_required": gate_result["recapture_required"],
                "rejection_reason": gate_result["reason"],
                "features": quality_features.to_dict(),
            },
            "dr": None,
            "referable_dr": None,
            "uncertainty": None,
            "reliability": None,
            "lesions": None,
            "structures": None,
            "explainability": None,
            "deployment": {
                "image_size": IMAGE_SIZE,
                "device": str(DEVICE),
            },
            "recommendation_status": "recapture_required",
            "recommendation": (
                "Technical rejection: please capture another retinal image with adequate visibility."
            ),
            "annotated_report": {
                "image_quality_status": gate_result["decision"],
                "image_quality_gradability_decision": "technical_quality_failure",
                "image_quality_gradable": False,
                "dr_grade": None,
                "dr_label": "Unassessable (Technical Rejection)",
                "dr_confidence": None,
                "calibration_temperature": CALIBRATION_TEMPERATURE,
                "referable_dr": None,
                "referable_probability": None,
                "uncertainty_level": "unassessable",
                "conformal_set_size": 0,
                "evidence_reliable": False,
                "review_required": True,
                "lesion_evidence_summary": {},
                "gradcam_available": False,
                "recommendation": "recapture_required",
                "disclaimer": (
                    "Uploaded image was rejected by technical input safeguards. "
                    "No AI screening prediction or DR grading was performed."
                ),
            },
        }

    # ---------------------------------------------------------
    # Model input
    # ---------------------------------------------------------

    transform = INFERENCE_TRANSFORM

    tensor = transform(
        model_image
    ).unsqueeze(0).to(DEVICE)
    print("[PREDICT] model_tensor_prepared", flush=True)

    # ---------------------------------------------------------
    # Unified Grad-CAM + Prediction Forward Pass
    # ---------------------------------------------------------

    try:
        print("[PREDICT] gradcam_generate_start", flush=True)
        gradcam_result = GRADCAM.generate(
            tensor,
            target_class=None,
        )
        print("[PREDICT] gradcam_generate_complete", flush=True)

        output = gradcam_result["output"]

        gradcam_overlay = _create_gradcam_overlay(
            model_image,
            gradcam_result["heatmap"],
        )
        print("[PREDICT] gradcam_overlay_created", flush=True)

        # Free Grad-CAM intermediaries now that overlay is rendered.
        del gradcam_result

    except Exception as exc:
        print(f"[PREDICT] gradcam_failed: {exc}", flush=True)
        raise HTTPException(
            status_code=500,
            detail=f"Grad-CAM generation failed: {exc}",
        ) from exc

    with torch.inference_mode():
        # Post-hoc temperature calibration fitted on
        # pooled E9 validation predictions only.
        dr_probabilities = torch.softmax(
            output["dr_logits"]
            / CALIBRATION_TEMPERATURE,
            dim=1,
        )[0]

        dr_grade = int(
            torch.argmax(dr_probabilities).item()
        )

        dr_confidence = float(
            dr_probabilities[dr_grade].item()
        )

        # Convert to plain Python list NOW to release tensor reference
        # before building the response dict.
        dr_class_probabilities: list[float] = [
            float(v.item()) for v in dr_probabilities
        ]
        del dr_probabilities

        referable_probability = float(
            torch.sigmoid(
                output["referable_logits"]
            )[0].item()
        )

        referable_prediction = (
            referable_probability
            >= REFERABLE_THRESHOLD
        )

        derived_referable = dr_grade >= 2

        # -----------------------------------------------------
        # Conformal prediction set
        # -----------------------------------------------------

        conformal_cutoff = (
            1.0 - CONFORMAL_THRESHOLD
        )

        conformal_set = [
            grade
            for grade in range(5)
            if dr_class_probabilities[grade] >= conformal_cutoff
        ]

        if not conformal_set:
            conformal_set = [dr_grade]

        if len(conformal_set) == 1:
            uncertainty_level = "low"
        elif len(conformal_set) <= 3:
            uncertainty_level = "moderate"
        else:
            uncertainty_level = "high"

        # -----------------------------------------------------
        # Experimental lesion map summaries
        # -----------------------------------------------------

        lesion_activations = {}

        for lesion in LESION_TYPES:
            lesion_activations[lesion] = float(
                torch.sigmoid(
                    output[f"{lesion}_logits"]
                ).mean().item()
            )

        # E7 evidence summary: robust upper-tail lesion
        # activation across the four experimental lesion heads.
        evidence_scores = []

        for lesion in LESION_TYPES:
            lesion_prob = torch.sigmoid(
                output[f"{lesion}_logits"]
            )

            flat = lesion_prob.flatten(
                start_dim=1
            )

            k = max(
                1,
                int(flat.shape[1] * 0.005),
            )

            evidence_scores.append(
                torch.topk(
                    flat,
                    k=k,
                    dim=1,
                ).values.mean(dim=1)
            )

        evidence_score = float(
            torch.stack(
                evidence_scores,
                dim=1,
            ).max(dim=1).values.item()
        )

        # Free all remaining tensors before leaving inference_mode.
        del output, tensor, evidence_scores

        evidence_reliable = (
            evidence_score >= EVIDENCE_THRESHOLD
        )

        review_for_uncertainty = (
            len(conformal_set) > 1
        )

        review_for_evidence = (
            dr_grade >= 2
            and not evidence_reliable
        )

        review_required = (
            review_for_uncertainty
            or review_for_evidence
        )

        # Direct referable head and DR-grade-derived
        # referability are intentionally reported separately.
        referable_disagreement = (
            referable_prediction
            != derived_referable
        )
        review_required = review_required or referable_disagreement

    # Release PyTorch graph memory and trim the C heap BEFORE
    # building the (potentially large) JSON response dict.
    gc.collect()
    try:
        import ctypes
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass
    print("[PREDICT] tensors_freed_gc_collected", flush=True)

    print("[PREDICT] response_built", flush=True)
    return {
        "status": "reportable",

        "model": {
            "experiment": MODEL_METADATA["experiment"],
            "experiment_family": "E9",
            "checkpoint_id": Path(
                MODEL_METADATA["checkpoint"]
            ).name,
            "checkpoint_epoch": MODEL_METADATA["epoch"],
            "image_size": IMAGE_SIZE,
            "device": str(DEVICE),
        },

        "image_quality": {
            "technical": {
                "decision": "accept",
                "valid": True,
                "issues": [],
                "action": "continue_with_caution",
                "gradability_stage": "passed_technical_checks",
                "enhancement": {
                    "applied": quality_status.get("enhancement_applied", []),
                    "clahe": "experimental_clahe_luminance" in quality_status.get("enhancement_applied", []),
                    "illumination_normalization": "bounded_illumination_normalization" in quality_status.get("enhancement_applied", []),
                    "denoising": "experimental_median_denoise" in quality_status.get("enhancement_applied", []),
                },
                "focus": {
                    "sharpness_laplacian_variance": quality_features.sharpness_laplacian_variance,
                },
                "illumination": {
                    "mean_luminance": quality_features.mean_luminance,
                    "luminance_stddev": quality_features.luminance_stddev,
                    "luminance_p05": quality_features.luminance_p05,
                    "luminance_p95": quality_features.luminance_p95,
                    "illumination_nonuniformity": quality_features.illumination_nonuniformity,
                    "dark_pixel_fraction": quality_features.dark_pixel_fraction,
                    "saturated_pixel_fraction": quality_features.saturated_pixel_fraction,
                },
                "field_of_view": {
                    "retinal_field_coverage": quality_features.retinal_field_coverage,
                    "background_pixel_fraction": quality_features.background_pixel_fraction,
                },
            },
            "clinical_readability": clinical_readability,
            "gradability_decision": "not_assessed",
            "gradable": None,
            "recapture_required": False,
            "rejection_reason": None,
            "features": quality_features.to_dict(),
        },

        "dr": {
            "grade": dr_grade,
            "label": DR_LABELS[dr_grade],
            "confidence": dr_confidence,
            "class_probabilities": dr_class_probabilities,
        },

        "referable_dr": {
            "prediction": referable_prediction,
            "probability": referable_probability,
            "threshold": REFERABLE_THRESHOLD,
            "threshold_source": REFERABLE_THRESHOLD_SOURCE,
            "derived_from_grade": derived_referable,
            "head_grade_disagreement": (
                referable_disagreement
            ),
            "protocol_note": (
                "PROTOCOL ASSUMPTION: grade >= 2 is the project's provisional "
                "referable-DR definition. Verify against the official SIH/clinical "
                "definition before clinical use."
            ),
        },

        "uncertainty": {
            "level": uncertainty_level,
            "conformal_prediction_set": conformal_set,
            "conformal_set_size": len(conformal_set),
            "review_trigger": len(conformal_set) > 1,
            "conformal_threshold": CONFORMAL_THRESHOLD,
            "calibration_temperature": (
                CALIBRATION_TEMPERATURE
            ),
            "source": CONFORMAL_SOURCE,
            "note": (
                "Conformal parameters were fitted on "
                "E9 validation predictions only. "
                "External-domain coverage can differ."
            ),
        },

        "reliability": {
            "evidence_score": evidence_score,
            "evidence_threshold": EVIDENCE_THRESHOLD,
            "evidence_reliable": evidence_reliable,
            "evidence_threshold_source": (
                EVIDENCE_THRESHOLD_SOURCE
            ),
            "review_required": review_required,
            "review_reasons": {
                "uncertainty": review_for_uncertainty,
                "low_evidence": review_for_evidence,
                "referable_head_grade_disagreement": (
                    referable_disagreement
                ),
            },
            "note": (
                "Experimental reliability gating. "
                "Not clinically validated."
            ),
        },

        "lesions": {
            "status": "experimental_map_summary",
            "note": (
                "Experimental lesion evidence: values are mean "
                "sigmoid activations of lesion maps and are not "
                "clinically validated lesion probabilities."
            ),
            "activations": lesion_activations,
            "named_activations": {
                LESION_LABELS[key]: value
                for key, value in lesion_activations.items()
            },
        },

        "structures": {
            "optic_disc": optic_disc_api_response(),
            "fovea": {
                "status": "not_implemented",
                "data_available": False,
                "blocker": (
                    "IDRiD fovea center coordinates are not present in the local data directory. "
                    "The dataset protocol (docs/dataset_protocol.md) notes these coordinates "
                    "should be available for 516 images but they have not been downloaded. "
                    "Acquire the IDRiD localization annotation file and verify its format "
                    "before implementing fovea localization."
                ),
                "center": None,
                "confidence": None,
            },
            "vessels": {
                "status": "not_implemented",
                "data_available": False,
                "blocker": (
                    "DRIVE dataset is not downloaded locally (only README exists at data/drive/README.md). "
                    "Acquire DRIVE images and vessel masks from https://drive.grand-challenge.org/ "
                    "before implementing vessel segmentation."
                ),
                "mask": None,
            },
            "neovascularization": {
                "status": "not_implemented",
                "data_available": False,
                "blocker": (
                    "No verified neovascularization annotations exist in any local dataset. "
                    "NV detection requires a dedicated labelled dataset with image-level or "
                    "pixel-level NV annotations from an authoritative source."
                ),
            },
            "note": "No structure model is deployed for arbitrary inference; no predictions are fabricated.",
        },

        "explainability": {
            "status": "available",
            "method": "Grad-CAM",
            "target": "predicted_dr_class",
            "target_layer": "encoder.7",
            "target_class": dr_grade,
            "lesion_evidence": {
                LESION_LABELS[key]: {
                    "activation": value,
                    "label": LESION_LABELS[key],
                    "status": "experimental_evidence",
                }
                for key, value in lesion_activations.items()
            },
            "validation_status": {
                "localization_agreement": {
                    "status": "IMPLEMENTED / NOT EVALUATED ON THIS IMAGE",
                    "method": "IoU at median threshold, pointing-game accuracy, overlap fraction",
                    "data": "IDRiD lesion masks (81 images, MA/HE/EX/SE)",
                    "module": "training/explainability/localization_eval.py",
                    "note": "Offline evaluation utility. Requires separate script execution against IDRiD masks.",
                },
                "explanation_fidelity": {
                    "status": "IMPLEMENTED / NOT EVALUATED ON THIS IMAGE",
                    "method": "Deletion test, Insertion test (AUC)",
                    "module": "training/explainability/fidelity_eval.py",
                    "note": "Offline evaluation utility. Requires model access and explicit invocation.",
                },
                "explanation_stability": {
                    "status": "IMPLEMENTED / NOT EVALUATED ON THIS IMAGE",
                    "method": "Cosine similarity under 6 defined perturbations",
                    "module": "training/explainability/stability_eval.py",
                    "perturbations": [
                        "brightness_plus10", "brightness_minus10",
                        "contrast_plus10pct", "contrast_minus10pct",
                        "translation_5px_right", "gaussian_noise_sigma2"
                    ],
                },
                "evidence_grade_consistency": {
                    "status": "IMPLEMENTED / NOT EVALUATED ON THIS IMAGE",
                    "method": "Spearman rank correlation (DR grade vs lesion activation)",
                    "module": "training/explainability/consistency_eval.py",
                },
                "clinical_review_protocol": {
                    "status": "PROTOCOL DEFINED / NOT EXECUTED",
                    "document": "docs/clinical_review_protocol.md",
                    "note": "No ophthalmologist review has taken place. This remains a validation target.",
                },
            },
            "note": (
                "Model-attribution visualization; "
                "not clinically validated lesion localization."
            ),
            "overlay_png_base64": gradcam_overlay,
        },

        "deployment": {
            "image_size": IMAGE_SIZE,
            "device": str(DEVICE),
        },

        "recommendation_status": (
            "review_required"
            if review_required
            else "screening_result_available"
        ),
        "recommendation": (
            "Clinical review recommended; this experimental screening-support output is not a diagnosis."
            if review_required
            else "Screening result available for clinical review; this output is not a diagnosis."
        ),

        # ----------------------------------------------------------
        # Annotated screening report
        # A single frontend-ready summary of the complete screening
        # result. Does not duplicate raw inference data; references
        # top-level fields. Not a clinical diagnosis.
        # ----------------------------------------------------------
        "annotated_report": {
            "image_quality_status": "passed_technical_checks",
            "image_quality_gradability_decision": "not_assessed",
            "image_quality_gradable": None,
            "clinical_readability_validated": False,
            "dr_grade": dr_grade,
            "dr_label": DR_LABELS[dr_grade],
            "dr_confidence": dr_confidence,
            "calibration_temperature": CALIBRATION_TEMPERATURE,
            "referable_dr": referable_prediction,
            "referable_probability": referable_probability,
            "uncertainty_level": uncertainty_level,
            "conformal_set_size": len(conformal_set),
            "evidence_reliable": evidence_reliable,
            "review_required": review_required,
            "lesion_evidence_summary": {
                LESION_LABELS[key]: round(value, 4)
                for key, value in lesion_activations.items()
            },
            "gradcam_available": True,
            "recommendation": (
                "review_required"
                if review_required
                else "screening_result_available"
            ),
            "disclaimer": (
                "This is experimental screening-support output from a research "
                "prototype. It is NOT a clinical diagnosis. Lesion evidence is "
                "based on experimental activation maps, not clinically validated "
                "lesion detection. Grad-CAM is model attribution only."
            ),
        },
    }
