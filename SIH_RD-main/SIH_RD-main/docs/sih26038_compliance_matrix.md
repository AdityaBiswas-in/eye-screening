# SIH-26038 Compliance Matrix

**Project:** Explainable AI for Diabetic Retinopathy Screening in Rural India  
**Model:** E9 (frozen) — `e9_full_referable_best.pt`  
**Last updated:** 2026-09-24

This matrix distinguishes engineering implementation from experimental work, formal validation, and work that has not been executed. E9 is a frozen research checkpoint; none of these rows establish clinical deployment safety.

---

## Status Definitions

| Code | Meaning |
|------|---------|
| IMPLEMENTED | Functionally working and integrated in `/predict` |
| IMPLEMENTED / EXPERIMENTAL | Working but not clinically validated |
| PARTIAL | Infrastructure present; key gaps remain |
| NOT IMPLEMENTED | Blocker prevents implementation |
| NOT VALIDATED | Implementation exists but no formal validation |
| BLOCKED BY ENVIRONMENT | Missing tools/data in this environment |
| TODO / VERIFY | Requires verification before claiming any status |

---

## Core Requirements

| Requirement | Status | File(s) | Evidence | Blocker |
|------------|--------|---------|----------|---------|
| DR 0-4 grading | IMPLEMENTED | `app/main.py`, `training/models/e8_referable_resnet50.py` | E9 checkpoint; 5-class output; calibrated probs | — |
| Referable DR | IMPLEMENTED | `app/main.py` | Direct E9 head + grade>=2 protocol; disagreement exposed | Protocol assumption, not clinical rule |
| Calibration (T=2.069366) | IMPLEMENTED | `app/main.py` | Applied in `/predict`; exposed in response | — |
| Uncertainty / conformal sets | IMPLEMENTED / EXPERIMENTAL | `app/main.py` | Conformal threshold 0.812996; set_size, review_trigger exposed | Fitted on E9 validation only |
| Evidence reliability | IMPLEMENTED / EXPERIMENTAL | `app/main.py` | Evidence threshold 0.238935; review_required logic | Not clinically validated |
| Explainability: Grad-CAM | IMPLEMENTED / EXPERIMENTAL | `app/inference/gradcam.py`, `app/main.py` | Base64 PNG overlay in response | Not clinically validated localization |
| Explainability: lesion evidence | IMPLEMENTED / EXPERIMENTAL | `app/main.py` | 4 lesion head activations; experimental_evidence status | Not lesion detection |
| Explainability: annotated report | IMPLEMENTED / EXPERIMENTAL | `app/main.py` | `annotated_report` block in response | Not clinical |
| Single API endpoint | IMPLEMENTED | `app/main.py` | `POST /predict`, `GET /health` only | — |
| Frontend contract | IMPLEMENTED | `docs/api_contract.md` | Documented; response schema stable | — |

---

## Image Quality Requirements

| Requirement | Status | File(s) | Evidence | Blocker |
|------------|--------|---------|----------|---------|
| Focus (sharpness) | IMPLEMENTED | `training/quality/features.py` | `sharpness_laplacian_variance`; unit tests | — |
| Illumination statistics | IMPLEMENTED | `training/quality/features.py` | mean, stddev, p05, p95, nonuniformity; unit tests | — |
| Field of view / coverage | IMPLEMENTED | `training/quality/features.py` | `retinal_field_coverage`, `background_pixel_fraction` | — |
| Adaptive enhancement routing | IMPLEMENTED / EXPERIMENTAL | `app/inference/quality_pipeline.py` | `EnhancementConfig`; IQA extension point ready | Off by default; not ablated |
| CLAHE | IMPLEMENTED / EXPERIMENTAL | `app/inference/quality_pipeline.py` | Opt-in luminance-only tile CLAHE | Not ablated; off by default |
| Illumination normalization | IMPLEMENTED / EXPERIMENTAL | `app/inference/quality_pipeline.py` | Opt-in bounded normalization | Not ablated; off by default |
| Denoising | IMPLEMENTED / EXPERIMENTAL | `app/inference/quality_pipeline.py` | Opt-in MedianFilter(3) | Not ablated; off by default |
| Ungradable rejection | NOT IMPLEMENTED | — | No verified gradability labels or threshold | Need verified quality labels + validated threshold |
| Recapture feedback | NOT IMPLEMENTED | — | No rejection rule implemented | Depends on ungradable detection |

---

## Retinal Structure Requirements

| Requirement | Status | File(s) | Evidence | Blocker |
|------------|--------|---------|----------|---------|
| Optic disc localization | NOT IMPLEMENTED | `app/main.py` (structures.optic_disc) | IDRiD OD masks exist (54 train, 27 test); no separate model | E9 has no OD head; separate model requires a training run outside current scope |
| Fovea localization | NOT IMPLEMENTED | `app/main.py` (structures.fovea) | No verified fovea coordinate/annotation data locally | Missing dataset |
| Vessel segmentation | NOT IMPLEMENTED | `app/main.py` (structures.vessels) | DRIVE README only; images/masks not downloaded | DRIVE not downloaded |
| Microaneurysm detection | IMPLEMENTED / EXPERIMENTAL | `app/main.py` (lesions.named_activations.microaneurysm) | E9 MA lesion-head activation | Not clinically validated segmentation |
| Hemorrhage detection/classification | IMPLEMENTED / EXPERIMENTAL | `app/main.py` (lesions.named_activations.hemorrhage) | E9 HE lesion-head activation | Not clinically validated |
| Hard exudate segmentation | IMPLEMENTED / EXPERIMENTAL | `app/main.py` (lesions.named_activations.hard_exudate) | E9 EX lesion-head activation | Not clinically validated |
| Soft exudate segmentation | IMPLEMENTED / EXPERIMENTAL | `app/main.py` (lesions.named_activations.soft_exudate) | E9 SE lesion-head activation | Not clinically validated |
| Neovascularization detection | NOT IMPLEMENTED | `app/main.py` (structures.neovascularization) | No verified NV dataset/annotations locally | Missing dataset |

---

## Validation Requirements

| Requirement | Status | File(s) | Evidence | Blocker |
|------------|--------|---------|----------|---------|
| Internal test (APTOS) | PARTIAL | `scripts/evaluate_e9_locked.py`, `training/evaluation/metrics.py` | Locked test split exists; results known (Acc=0.807, QWK=0.866, Sens=0.955, Spec=0.908) | Final report generation not integrated into API |
| External / domain shift (IDRiD) | PARTIAL | `scripts/evaluate_e3_idrid.py` | IDRiD results known (Acc=0.534, Spec=0.718 — does NOT meet >85% SIH target) | IDRiD specificity gap documented honestly |
| Calibration validation (ECE/Brier/NLL) | NOT VALIDATED | `training/evaluation/metrics.py` | Metrics defined; not computed from final locked test | TODO/DEFINE |
| Selective prediction (AURC/coverage) | NOT VALIDATED | — | Metrics defined in config; not evaluated | TODO/DEFINE |
| Image quality stratification | TODO / VERIFY | — | Quality features exist; no validated strata | Need verified gradability labels |
| Explanation evaluation | NOT VALIDATED | — | localization_agreement/fidelity/stability marked TODO/VERIFY in response | No ground truth localization evaluation |
| Error analysis | PARTIAL | `scripts/analyze_idrid_false_positives.py` | FP analysis script exists | Manual script; not integrated into API |
| Messidor-2 external validation | NOT VALIDATED | — | Label mapping not verified; not executed | Official Messidor-2 has no DR ground truth per config |

---

## Performance Evidence (Locked — Do Not Alter)

| Dataset | Metric | Value |
|---------|--------|-------|
| APTOS (locked test) | Accuracy | 0.807273 |
| APTOS (locked test) | Macro F1 | 0.680432 |
| APTOS (locked test) | QWK | 0.866358 |
| APTOS (locked test) | Referable sensitivity | 0.955157 |
| APTOS (locked test) | Referable specificity | 0.908257 |
| APTOS (locked test) | ROC-AUC | 0.979731 |
| APTOS (locked test) | PR-AUC | 0.969363 |
| IDRiD (official test) | Accuracy | 0.533981 |
| IDRiD (official test) | Macro F1 | 0.460244 |
| IDRiD (official test) | QWK | 0.585680 |
| IDRiD (official test) | Referable sensitivity | 0.906250 |
| IDRiD (official test) | Referable specificity | 0.717949 |
| IDRiD (official test) | ROC-AUC | 0.919071 |
| IDRiD (official test) | PR-AUC | 0.959151 |

**NOTE:** IDRiD specificity (0.718) does NOT meet the SIH >85% target. This is documented honestly. Do not claim global SIH compliance.

---

## Deployment Requirements

| Requirement | Status | Evidence | Blocker |
|------------|--------|----------|---------|
| FastAPI /predict | IMPLEMENTED | `app/main.py`; smoke tested with real APTOS image | — |
| FastAPI /health | IMPLEMENTED | `app/main.py` | — |
| Upload size limit (20MB guard) | IMPLEMENTED | `app/main.py`; HTTP 413 unit tested | — |
| Docker container | BLOCKED BY ENVIRONMENT | Dockerfile/docker-compose exist | Docker daemon unavailable; start Docker Desktop |
| MATLAB image quality & enhancement | IMPLEMENTED / EXPERIMENTAL | `matlab/sih26038_quality_assessment.m`, `matlab/demo/run_sih26038_demo.m` | Feature extraction, adaptive enhancement, Python E9 contract payload | Local Mac host lacks MATLAB binary |
| Simulink telemedicine simulation | IMPLEMENTED / EXPERIMENTAL | `matlab/sih26038_telemedicine_simulation.m`, `matlab/sih26038_simulink_spec.m` | District 100k+ annual capacity scenario, upload latencies, human review queue | Local Mac host lacks Simulink binary |

---

## Contradiction Audit

| Claim | Verification |
|-------|-------------|
| HE = hemorrhage (not exudate) | CORRECT — `predictor.py` maps `he: hemorrhage` |
| Grad-CAM is model attribution, not clinical localization | CORRECT — `note` field present in `explainability` block |
| E9 globally meets SIH sensitivity/specificity | NOT CLAIMED — IDRiD specificity gap documented |
| Ophthalmologist <30 sec validation | NOT CLAIMED |
| MATLAB executed | NOT CLAIMED — BLOCKED BY ENVIRONMENT |
| Simulink executed | NOT CLAIMED — BLOCKED BY ENVIRONMENT |
| Docker validated | NOT CLAIMED — BLOCKED BY ENVIRONMENT |
| Fovea coordinates available | NOT CLAIMED — `not_implemented` with blocker |
| Neovascularization labels available | NOT CLAIMED — `not_implemented` with blocker |
| Missing lesion annotation = negative lesion | NOT DONE — project rule preserved in code |
| External test data used for tuning | NOT DONE — locked splits preserved |
| E9 retrained | NOT DONE — checkpoint frozen |

---

## TODO / VERIFY

- Optic disc: Separate lightweight OD segmentation (e.g., U-Net on IDRiD 54 OD masks) is technically feasible without touching E9, but requires a dedicated training run outside current scope
- Fovea: Verify any external verified source (e.g., MAGRABIA, Kaggle fovea competitions)
- Neovascularization: IDRiD does not provide NV labels; no other verified local source found
- Messidor-2: Verify RECA score to DR grade mapping before evaluation
- Calibration validation: Compute ECE/Brier/NLL on locked test
- Selective prediction: Evaluate coverage/AURC/selective-risk on locked test
- Statistical confidence intervals: Policy TODO/DEFINE
- Quality stratification: Requires verified gradability labels
