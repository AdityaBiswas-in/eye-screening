# Simulink Telemedicine System Deployment Simulation (`sih26038_pipeline.slx`)

## Overview

The Simulink model `matlab/simulink/sih26038_pipeline.slx` represents the **system-level deployment simulation** of the SIH-26038 telemedicine workflow around the authoritative Python E9 AI system.

```text
[Image Acquisition]
        │ (100,000+ Annual Scenario Volume)
        ▼
[Network Upload]
        │ (2.5 MB Image / 2.0 Mbps Bandwidth -> 10.0s Latency)
        ▼
[MATLAB Quality Processing]
        │ (Focus, Illumination, FOV Features & Enhancement)
        ▼
[Python E9 Inference Interface]
        │ (Abstract Interface to Python FastAPI POST /predict)
        ▼
[DR Decision]
        │ (DR Grade 0-4 & Direct Referable Head)
        ▼
[Calibration & Uncertainty]
        │ (Temperature T=2.069366 & Conformal Set Cutoff=0.812996)
        ▼
[Evidence Reliability Gate]
        │ (Top-k Lesion Threshold 0.238935)
   ┌────┴────┐
   ▼         ▼
[Automated] [Human Review Queue]
 Screening   (Ophthalmologist Capacity)
   └────┬────┘
        ▼
[Screening Report]
```

---

## Important Architectural Disclaimers

1. **System-Level Deployment Simulation:** This Simulink model simulates the operational workflow, bandwidth delays, processing queues, and specialist review capacity of rural telemedicine screening.
2. **External Python Inference Interface:** The `Python E9 Inference Interface` block is an abstract system interface representing the FastAPI backend (`POST /predict`). Simulink **does not** execute the PyTorch checkpoint (`checkpoints/e9_full_referable_best.pt`) natively inside Simulink.
3. **Simulation Scenarios & Assumptions:** All throughput and latency values (e.g., $10.4\text{ s/patient}$ total latency, $14.8\%$ review routing rate, $\sim 85.6\%$ reviewer utilization) are **calculated simulation metrics or scenario assumptions**. They are **not** measured clinical trial results.
4. **$100,\!000+$ Patient Capacity Scenario:** The $100,\!000+$ annual patient figure is a **capacity simulation scenario requirement** to evaluate district-level scalability. It is **not** a claim that the system has screened $100,\!000$ real patients.
5. **Non-Clinical Validation:** This model and its outputs are research screening-support system simulations and do **not** constitute clinical validation or a medical diagnosis.

---

## Files

- `sih26038_pipeline.slx`: Simulink model container.
- `build_sih26038_simulink_model.m`: MATLAB script to programmatically build and open the model.
- `README.md`: System layer documentation.
