# Simulink & Telemedicine System Design

## Architecture Overview

The Simulink/telemedicine layer models the district-level screening workflow surrounding the core Python E9 AI inference system:

```text
[District Screening Stations]
            │
            ▼
[Image Acquisition & Transfer]
            │ (Upload Bandwidth & Network Latency)
            ▼
[MATLAB Image Quality Assessment]
            │ (Focus, Illumination, FOV Features)
            ▼
[Adaptive Enhancement]
            │ (CLAHE, Illumination Normalization, Denoise)
            ▼
[Python E9 Inference Engine]
            │ (DR Grading, Referable Head, Lesion Evidence)
            ▼
[Calibration & Uncertainty]
            │ (Temperature Scaling T=2.069366, Conformal Set)
            ▼
[Evidence Reliability Gate]
            │ (Top-k Lesion Activation Threshold 0.238935)
     ┌──────┴──────┐
     ▼             ▼
[Automatic]    [Human Review]
  Report       (Ophthalmologist Queue)
```

---

## Deployment & Throughput Simulation Parameters

The simulation module ([matlab/sih26038_telemedicine_simulation.m](file:///Users/mdnaif/Desktop/SIH2026/sih-26038/matlab/sih26038_telemedicine_simulation.m)) and specification ([matlab/sih26038_simulink_spec.m](file:///Users/mdnaif/Desktop/SIH2026/sih-26038/matlab/sih26038_simulink_spec.m)) provide configurable parameters for rural deployment scenarios:

- **Target Annual Volume Scenario:** $100,\!000+$ patients/year
- **District Screening Stations:** 15 stations
- **Operating Schedule:** 300 days/year, 8 hours/day
- **Network Upload:** Configurable bandwidth (e.g. 2.0 Mbps for 2.5 MB image)
- **AI Processing Time:** Preprocessing ($0.15\text{ s}$) + E9 Inference ($0.25\text{ s}$)
- **Human Review Routing Rate:** $14.8\%$ (based on E7 validation review rate)
- **Ophthalmologist Reviewers:** 3 reviewers ($12\text{ cases/hour/reviewer}$)

---

## Simulated Output Metrics

1. **Annual Processed Patients:** Evaluates scenario capacity ($\ge 100,\!000$).
2. **Total End-to-End Latency:** Network transfer + AI pipeline processing duration.
3. **Automated vs Human Review Workload:** Quantifies automatic screening reports vs cases queued for specialist review.
4. **Ophthalmologist Utilization Percentage:** Measures reviewer queue demand against available capacity.

> [!IMPORTANT]
> The $100,\!000+$ annual figure is a capacity simulation scenario requirement to demonstrate district-level throughput scalability. It is not a claim that the prototype has screened $100,\!000$ real patients.
