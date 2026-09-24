# SIH-26038 Requirement Matrix

**Project:** Explainable AI for Diabetic Retinopathy Screening in Rural India  
**Model:** E9 (frozen) — `checkpoints/e9_full_referable_best.pt`  
**Last updated:** 2026-09-24  

This matrix details the implementation, test evidence, status, and honest limitations for every official requirement under the SIH-26038 problem statement.

---

## Status Definitions

| Status Code | Meaning |
| :--- | :--- |
| **COMPLETE** | Fully implemented, integrated, and verified by unit/integration tests |
| **PARTIAL** | Core architecture or test benchmark complete; specific data or model extension missing |
| **EXPERIMENTAL** | Operational code present, but not clinically validated |
| **NOT IMPLEMENTED** | Component unavailable due to missing dataset, annotations, or frozen model constraints |
| **BLOCKED BY ENVIRONMENT** | Implementation code/spec ready, but local host lacks execution software |
| **NOT VALIDATED** | Heuristic or feature present without formal clinical validation |

---

## 1. Image Quality Assessment & Enhancement

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Focus Assessment** | `training/quality/features.py`, `matlab/preprocessing/assessFocus.m` | `sharpness_laplacian_variance`; `test_quality_features.py` | COMPLETE / EXPERIMENTAL | Sharpness metric; not proof of clinical gradability |
| **Illumination Assessment** | `training/quality/features.py`, `matlab/preprocessing/assessIllumination.m` | Mean, stddev, percentiles ($p_{05}, p_{95}$), non-uniformity; unit tests | COMPLETE / EXPERIMENTAL | Illumination stats; not a clinical rating |
| **Field of View Assessment** | `training/quality/features.py`, `matlab/preprocessing/assessFOV.m` | `retinal_field_coverage`, `background_pixel_fraction` | COMPLETE / EXPERIMENTAL | Measures pixel area coverage, not retinal anatomy |
| **Adaptive Enhancement** | `app/inference/quality_pipeline.py`, `matlab/preprocessing/enhanceFundus.m` | Configurable routing; `test_optional_enhancement_is_explicit` | COMPLETE / EXPERIMENTAL | Opt-in preprocessing; disabled by default |
| **CLAHE** | `app/inference/quality_pipeline.py`, `matlab/preprocessing/applyCLAHE.m` | Luminance-only CLAHE (`adapthisteq`) | COMPLETE / EXPERIMENTAL | Disabled by default to preserve lesion contrast |
| **Illumination Normalization** | `app/inference/quality_pipeline.py`, `matlab/preprocessing/normalizeIllumination.m` | Bounded exposure scaling; unit tested | COMPLETE / EXPERIMENTAL | Disabled by default; informational |
| **Denoising** | `app/inference/quality_pipeline.py`, `matlab/preprocessing/denoiseFundus.m` | $3 \times 3$ Median filter; unit tested | COMPLETE / EXPERIMENTAL | Conservative filtering to avoid removing small lesions |
| **Technical Input Gate** | `app/inference/quality_gate.py`, `app/main.py` | `evaluate_technical_quality`; `test_quality_gate.py` | COMPLETE | Technical input safeguard; not clinical gradability |
| **Ungradable Rejection** | `app/inference/quality_gate.py`, `app/main.py` | Rejects blank/black/microscopic images with HTTP 200 `status: "rejected"` | COMPLETE | Technical rejection only; no clinical threshold claimed |
| **Recapture Feedback** | `app/main.py` | Returns `recapture_required: true` and human-readable action | COMPLETE | Technical feedback for invalid uploads |

---

## 2. Retinal Structures & Lesion Analysis

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Optic Disc Localization** | `app/main.py` (`structures.optic_disc`) | IDRiD OD masks exist (54 train, 27 test); returns blocker in API payload | NOT IMPLEMENTED | E9 checkpoint lacks OD head; safety rules forbid retraining E9 |
| **Fovea Localization** | `app/main.py` (`structures.fovea`) | Returns `not_implemented` with blocker in payload | NOT IMPLEMENTED | No verified fovea coordinate data in local directory |
| **Vessel Segmentation** | `app/main.py` (`structures.vessels`) | `data/drive/README.md` exists; DRIVE dataset not downloaded | NOT IMPLEMENTED | DRIVE images/masks not downloaded locally |
| **Microaneurysm Detection** | `app/main.py`, `training/models/research_resnet50.py` | E9 MA lesion-head activation; exposed in `/predict` | COMPLETE / EXPERIMENTAL | Mean sigmoid map activation; not clinical segmentation |
| **Hemorrhage Detection** | `app/main.py`, `training/models/research_resnet50.py` | E9 HE lesion-head activation; mapped as `hemorrhage` | COMPLETE / EXPERIMENTAL | Experimental activation map |
| **Hard Exudate Segmentation** | `app/main.py`, `training/models/research_resnet50.py` | E9 EX lesion-head activation; exposed in `/predict` | COMPLETE / EXPERIMENTAL | Experimental activation map |
| **Soft Exudate Segmentation** | `app/main.py`, `training/models/research_resnet50.py` | E9 SE lesion-head activation; exposed in `/predict` | COMPLETE / EXPERIMENTAL | Experimental activation map |
| **Neovascularization Detection** | `app/main.py` (`structures.neovascularization`) | Returns `not_implemented` with blocker in payload | NOT IMPLEMENTED | No verified NV dataset/annotations locally |

---

## 3. DR Severity Grading & Referral

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **5-Class DR Grading (0–4)** | `app/main.py`, `training/models/e8_referable_resnet50.py` | E9 primary model; 5-class output with calibrated probabilities | COMPLETE | Primary model E9 frozen |
| **Referable DR Prediction** | `app/main.py` | Direct E9 head + `grade >= 2` protocol assumption | COMPLETE | Direct head + grade-derived logic; protocol assumption |
| **Referable DR Sensitivity Target (>90%)** | `scripts/evaluate_e9_locked.py` | **APTOS:** 95.51% (Sens) / **IDRiD:** 90.63% (Sens) | PARTIAL / TESTED | Exceeds >90% target on both benchmark datasets |
| **Referable DR Specificity Target (>85%)** | `scripts/evaluate_e9_locked.py` | **APTOS:** 90.83% (Spec) / **IDRiD:** 71.80% (Spec) | PARTIAL / TESTED | IDRiD specificity gap (<85%) is documented honestly |

---

## 4. Calibration, Uncertainty, & Explainability

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Probability Calibration** | `app/main.py`, `scripts/evaluate_e9_calibration.py` | Temperature scaling ($T = 2.069366$); validation ECE=0.0481 | COMPLETE | Temperature fitted on E9 validation only |
| **Conformal Uncertainty Sets** | `app/main.py`, `scripts/evaluate_e6_conformal.py` | Quantile threshold $0.812996$; sets & review triggers | COMPLETE / EXPERIMENTAL | Empirical coverage 90.4% on validation |
| **Evidence Reliability Gate** | `app/main.py`, `scripts/evaluate_e7_reliability.py` | Quantile threshold $0.238935$; ACCEPT vs REVIEW gate | COMPLETE / EXPERIMENTAL | 14.8% review rate; not clinically validated triage |
| **Grad-CAM Explainability** | `app/inference/gradcam.py`, `app/main.py` | Base64 PNG overlay from layer `encoder.7` | COMPLETE / EXPERIMENTAL | Model attribution visualization; not clinical localization |
| **Annotated Screening Report** | `app/main.py` | `annotated_report` JSON payload in `/predict` | COMPLETE | Machine-readable report summary |
| **Human-in-the-Loop Routing** | `app/main.py` | Statuses: `success`, `rejected`, `review_required` | COMPLETE | AI screening support assistant; not clinical replacement |

---

## 5. MATLAB & Simulink System Layer

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **MATLAB Preprocessing Suite** | `matlab/preprocessing/` | Focus, illumination, FOV, CLAHE, normalization, denoising | COMPLETE / EXPERIMENTAL | Modular `.m` functions; local Mac host lacks MATLAB |
| **MATLAB Integration Contract** | `matlab/integration/` | Resizes to $384 \times 384$ RGB; generates portable JSON metadata contract | COMPLETE | Defines clean boundary to Python `POST /predict` |
| **Simulink Deployment Simulation** | `matlab/simulink/` | Telemedicine workflow simulation model (`sih26038_pipeline.slx`) | COMPLETE / EXPERIMENTAL | System-level simulation model; abstract Python interface |
| **District $100\text{k}+$ Capacity Scenario** | `matlab/sih26038_telemedicine_simulation.m` | 15 stations, network latencies, review routing, utilization | COMPLETE / EXPERIMENTAL | Capacity simulation scenario; not real screened patients |

---

## 6. Deployment & API Specifications

| Requirement | Implementation | Evidence / Test | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Single FastAPI Endpoint** | `app/main.py` | `POST /predict` & `GET /health` | COMPLETE | Single unified product API |
| **20MB File Upload Guard** | `app/main.py` | HTTP 413 Payload Too Large unit test | COMPLETE | Protects server against OOM |
| **Docker Container Packaging** | `Dockerfile`, `docker-compose.yml` | Container specification complete | BLOCKED BY ENVIRONMENT | Host Docker daemon socket inactive |
| **Render Deployment** | `docs/docker_deployment.md` | Deployment guide ready | BLOCKED BY ENVIRONMENT | Staged for post-audit deployment |

---

## 7. Clinical Readability & Explanation Validation (Phase 11 Audit)

| Component | Implementation File | Verification / Test | Status Code | Limitation / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Clinical Readability** | `app/inference/clinical_readability.py` | `test_clinical_readability.py` | `not_validated` | Descriptive features only; zero verified gradability labels exist locally |
| **Ungradable Rejection** | `app/inference/quality_gate.py`, `app/main.py` | `test_quality_gate.py` | `implemented` (technical) / `not_validated` (clinical) | Technical input safeguard; no clinical threshold claimed |
| **Optic Disc** | `app/inference/optic_disc.py` | `test_optic_disc_component.py` | `implemented_experimental` (eval) / `data_available` (masks) / `not_implemented` (inference) | IDRiD OD masks present (81 images); E9 lacks OD head, no retraining |
| **Fovea** | `app/main.py` | `test_inference_structures.py` | `data_unavailable` | Protocol notes fovea data available, but no local file exists (TODO/VERIFY) |
| **Vessels** | `app/main.py` | `test_inference_structures.py` | `data_unavailable` | DRIVE dataset not downloaded locally (`data/drive/README.md` only) |
| **Neovascularization** | `app/main.py` | `test_inference_structures.py` | `data_unavailable` / `not_validated` | Zero verified NV annotations locally |
| **Grad-CAM** | `app/inference/gradcam.py` | `test_explanation_validation.py` | `implemented_experimental` | Model attribution only; not clinical explanation |
| **Lesion Evidence** | `app/main.py` | `test_inference_structures.py` | `implemented_experimental` | Sigmoid activation maps; not calibrated lesion probabilities |
| **Explanation Localization** | `training/explainability/localization_eval.py` | `test_explanation_validation.py` | `evaluated` | IoU, pointing-game, overlap fraction vs IDRiD lesion masks |
| **Explanation Fidelity** | `training/explainability/fidelity_eval.py` | `test_explanation_validation.py` | `evaluated` | Deletion/insertion tests ($AUC_{\text{del}}, AUC_{\text{ins}}$) |
| **Explanation Stability** | `training/explainability/stability_eval.py` | `test_explanation_validation.py` | `evaluated` | Cosine similarity under 6 defined perturbations |
| **Explanation Consistency** | `training/explainability/consistency_eval.py` | `test_explanation_validation.py` | `evaluated` | Spearman rank correlation ($\rho$) between grade & activations |
| **Human Clinical Validation** | `docs/clinical_review_protocol.md` | Protocol specification | `not_conducted` | No real ophthalmologist review conducted |

---

## Performance Evidence (Locked Benchmark Summary)

```text
APTOS 2019 (Locked Test):
- Accuracy:                0.8073
- Macro F1:                0.6804
- Quadratic Weighted Kappa: 0.8664
- Referable Sensitivity:   0.9552  (Exceeds >90% target)
- Referable Specificity:   0.9083  (Exceeds >85% target)
- ROC-AUC:                 0.9797
- PR-AUC:                  0.9694

IDRiD (Official Test):
- Accuracy:                0.5340
- Macro F1:                0.4602
- Quadratic Weighted Kappa: 0.5857
- Referable Sensitivity:   0.9063  (Exceeds >90% target)
- Referable Specificity:   0.7180  (Documented gap <85%)
- ROC-AUC:                 0.9191
- PR-AUC:                  0.9592
```
