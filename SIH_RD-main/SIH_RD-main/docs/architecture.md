# SIH-26038 Implemented Research Backend

SIH-26038 is a screening-support research project for diabetic retinopathy (DR) in rural India. The architecture below is a **research hypothesis/candidate architecture** assembled from relevant literature directions. Its novelty, safety, and effectiveness are not established facts and must be experimentally validated before deployment.

## A. Production inference pipeline

The deployed backend exposes exactly one primary inference endpoint: `POST /predict`. A client supplies one fundus image and receives the complete screening result in one response. Internal components may be separate models or modules, but they are not exposed as separate public inference endpoints.

```text
Fundus image
  → multi-dimensional image quality assessment
  → quality-guided preprocessing
  → E9 shared ResNet-50 retinal representation
  → lesion/evidence branch
  → anatomical/structure branch, only where justified
  → cross-task interaction between lesion evidence and grading
  → DR grade (0–4)
  → referable DR (grade ≥2)
  → probability calibration
  → ordinal/conformal uncertainty
  → evidence-reliability gate
  → Grad-CAM model attribution + lesion-evidence explanation
  → structured safety/reliability report
  → single FastAPI POST /predict response
```

Implemented E9 inference uses a shared ResNet-50, MHSA, experimental lesion heads, a direct referable-DR head, frozen temperature scaling, conformal-set reporting, evidence reliability gating, and Grad-CAM. The default API quality route computes deterministic focus, illumination, and field measurements but has no validated gradability threshold; it does not reject the image. Optional illumination normalization, median denoising, and CLAHE are implemented as disabled experimental operations and require ablation before activation.

Optic-disc, fovea, vessel, and neovascularization inference models are not deployed. The API returns explicit `not_implemented` statuses rather than fabricated outputs. Lesion maps are experimental evidence, not clinically validated lesion probabilities.

`referable_dr` is derived from the project’s stated definition: DR grade `>= 2`. The decision threshold, calibration method, uncertainty method, and gate policy remain research decisions, not fixed implementation choices.

## B. Training and research experiments

The following are experiments, not production commitments:

- Compare a grading-only baseline with quality-aware and quality-guided variants.
- Evaluate candidate retinal encoders and domain-generalization approaches on held-out acquisition domains.
- Evaluate lesion supervision and, only if clinically justified labels exist, an anatomical/structure branch.
- Ablate cross-task fusion to test whether lesion evidence improves grading or explanation grounding.
- Compare ordinal grading, probability-calibration, and ordinal/conformal uncertainty approaches.
- Test screening sensitivity and specificity for referable DR, then assess calibration, subgroup performance, failure modes, and external generalization.
- Evaluate explanation localization/faithfulness against lesion annotations when available and obtain clinical review before presenting explanations as evidence.

The target operational metrics are referable-DR sensitivity above 90% and specificity above 85%; these are goals to validate, not claims about a model.

## C. Future research extensions

- Prospective validation in intended rural acquisition settings and across devices/operators.
- Formal clinical workflow, human-factors, and safety evaluation for retake/referral recommendations.
- Monitoring for domain shift and post-deployment performance drift.
- Extension to additional clinically supported tasks only after their labels, validation protocol, and safety case are established.

The FastAPI research prototype, E9 checkpoint loader, and training/evaluation utilities are implemented. This system is not clinically validated and does not present its output as a medical diagnosis.
