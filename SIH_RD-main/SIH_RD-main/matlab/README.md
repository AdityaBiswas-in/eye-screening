# MATLAB & Simulink System Layer for SIH-26038

## Architecture Boundary

The primary AI inference engine for SIH-26038 is the Python/PyTorch **E9 model** (`checkpoints/e9_full_referable_best.pt`), deployed via FastAPI (`POST /predict`).

MATLAB Online and the local Python development environment are separate execution environments. MATLAB provides system-level image-quality assessment, adaptive enhancement, contract payload formatting, and telemedicine deployment simulations around the authoritative Python AI system.

```text
matlab/
├── preprocessing/
│   ├── assessFocus.m               # Sharpness via Laplacian variance
│   ├── assessIllumination.m         # Luminance, stddev, percentiles, nonuniformity
│   ├── assessFOV.m                  # Retinal field coverage percentage
│   ├── applyCLAHE.m                 # Luminance-only adapthisteq
│   ├── normalizeIllumination.m      # Bounded global exposure normalization
│   ├── denoiseFundus.m              # Conservative 3x3 median filtering
│   └── enhanceFundus.m              # Configurable enhancement pipeline
│
├── integration/
│   ├── prepareInferenceInput.m      # Resizes to 384x384 RGB tensor layout
│   └── createInferenceContract.m    # Portable JSON metadata contract payload
│
├── evaluation/
│   └── evaluateMATLABPreprocessing.m # Quantitative evaluation of quality metrics
│
├── demo/
│   └── run_sih26038_demo.m          # Executable system layer demo entry point
│
├── sih26038_quality_features.m      # Monolithic feature extraction helper
├── sih26038_enhance_image.m         # Monolithic enhancement helper
├── sih26038_quality_assessment.m    # Quality analysis wrapper
├── sih26038_telemedicine_simulation.m # 100k+ annual capacity simulation
└── README.md
```

---

## Integration Contract & Status

- **Gradability Status:** `FEATURES_AVAILABLE`
- **Clinical Validation Status:** `NOT_CLINICALLY_VALIDATED` (`experimental_only = true`)
- **Integration Payload Status:** `E9_INFERENCE_EXTERNAL_PYTHON`
- **Primary AI Model:** Python/PyTorch E9 (`POST /predict`)
