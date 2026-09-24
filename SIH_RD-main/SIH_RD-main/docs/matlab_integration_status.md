# MATLAB / Simulink System Layer Integration Status

## Architectural Boundary

Python/PyTorch remains the authoritative AI inference engine for SIH-26038 (`POST /predict` backed by frozen E9 model `checkpoints/e9_full_referable_best.pt`).

The MATLAB / Simulink system layer is built around this AI system to satisfy system-level image-processing, quality analysis, and deployment-simulation requirements:

```text
Fundus Image
    ↓
MATLAB Image Quality Assessment (`sih26038_quality_features.m`)
    ↓
MATLAB Adaptive Enhancement (`sih26038_enhance_image.m`)
    ↓
MATLAB Quality Assessment (`sih26038_quality_assessment.m`)
    ↓
Existing Python/PyTorch E9 Inference Engine (`app/main.py`)
    ↓
DR Grading / Referable DR / Calibration / Uncertainty / Reliability
    ↓
Grad-CAM / Lesion Evidence / Annotated Screening Report
    ↓
FastAPI Backend & Frontend
```

---

## MATLAB Module Inventory

1. **Deterministic Feature Extraction:** `matlab/sih26038_quality_features.m`
   - Focus: Discrete 4-neighbor Laplacian variance (`sharpness_laplacian_variance`)
   - Illumination: Mean, stddev, 5th/95th percentiles, quadrant stddev (`illumination_nonuniformity`), dark & saturated pixel fractions
   - Field of View: Retinal field coverage (`retinal_field_coverage`)
2. **Configurable Adaptive Enhancement:** `matlab/sih26038_enhance_image.m`
   - Optional Luminance-only CLAHE (`adapthisteq`)
   - Optional Bounded Illumination Normalization
   - Optional Conservative Denoising ($3 \times 3$ median filter)
3. **Quality Assessment Pipeline:** `matlab/sih26038_quality_assessment.m`
   - Combines feature extraction, enhancement routing, and status formatting (`FEATURES_AVAILABLE`, `NOT_CLINICALLY_VALIDATED`, `experimental_only = true`).
4. **Demo Entry Point:** `matlab/demo/run_sih26038_demo.m`
   - Demonstrates quality assessment on fundus images and formats the `E9_INFERENCE_EXTERNAL_PYTHON` payload contract for Python inference.
5. **Telemedicine Capacity Simulation:** `matlab/sih26038_telemedicine_simulation.m`
   - Configurable district deployment simulation for $100,\!000+$ annual screening volume scenarios, network upload latency, AI pipeline processing time, reliability-guided human review routing, and reviewer capacity utilization.

---

## Verification Status

| Component | Status | Location | Evidence / Note |
| :--- | :--- | :--- | :--- |
| **Focus Assessment** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_quality_features.m` | Laplacian variance metric; no clinical rejection claim |
| **Illumination Assessment** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_quality_features.m` | Mean, stddev, percentiles, nonuniformity |
| **Field of View Assessment** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_quality_features.m` | Retinal coverage percentage |
| **CLAHE / Illum / Denoise** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_enhance_image.m` | Configurable optional preprocessing stage |
| **Quality Decision Structure** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_quality_assessment.m` | Exposes `FEATURES_AVAILABLE`, `experimental_only = true` |
| **Telemedicine Simulation** | `IMPLEMENTED / EXPERIMENTAL` | `matlab/sih26038_telemedicine_simulation.m` | $100\text{k}+$ capacity scenario, latencies, human review queue |
| **MATLAB Demo Script** | `IMPLEMENTED` | `matlab/demo/run_sih26038_demo.m` | Executable `.m` script for local/cloud MATLAB |
| **Python E9 Integration Contract** | `IMPLEMENTED` | `matlab/sih26038_integration_spec.m` | Formats payload contract for Python `POST /predict` |

---

## Environment & Interoperability Notes

- **Primary Inference Owner:** Python/PyTorch E9 backend remains authoritative. The frozen checkpoint `e9_full_referable_best.pt` was not retrained, modified, or duplicated.
- **Local Mac Environment:** MATLAB is not installed in system PATH on local development host.
- **MATLAB Online Environment:** Designed using standard MATLAB core + Image Processing Toolbox functionality to run in MATLAB Online / local MATLAB environments without requiring unlicensed Deep Learning Toolboxes.
