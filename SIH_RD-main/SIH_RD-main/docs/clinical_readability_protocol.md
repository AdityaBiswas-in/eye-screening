# Clinical Readability Protocol

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** NOT VALIDATED / EXPERIMENTAL  
**Last updated:** 2026-09-24  

---

## 1. Distinction: Technical Quality vs Clinical Readability

| Dimension | Scope | Current Implementation | Clinical Validation Status |
| :--- | :--- | :--- | :--- |
| **Technical Quality** | Engineering input sanity checks (sharpness Laplacian variance, illumination mean/std, field coverage, saturation/dark pixel fractions) | `app/inference/quality_gate.py` (`evaluate_technical_quality`) | **COMPLETE** (Technical input safeguard) |
| **Clinical Readability** | Diagnostic gradability for DR screening as determined by trained ophthalmologist review | `app/inference/clinical_readability.py` (`assess_clinical_readability`) | **NOT VALIDATED** (No ground-truth clinical gradability labels exist in local project) |

---

## 2. API Response Fields

```json
{
  "image_quality": {
    "technical": {
      "decision": "accept|reject",
      "valid": true,
      "issues": [],
      "action": "continue_with_caution|recapture_required",
      "gradability_stage": "passed_technical_checks|technical_quality_failure"
    },
    "clinical_readability": {
      "status": "not_validated",
      "gradable": null,
      "observations": {
        "focus": { "sharpness_laplacian_variance": 0.0, "note": "Descriptive feature only" },
        "illumination": { "mean_luminance": 85.6, "note": "Descriptive feature only" }
      },
      "annotation_protocol_required": {
        "status": "NOT_COLLECTED",
        "required_labels": ["gradable", "ungradable", "uncertain"]
      }
    },
    "gradability_decision": "not_assessed",
    "gradable": null,
    "recapture_required": false,
    "rejection_reason": null
  }
}
```

---

## 3. Ground-Truth Data Collection Protocol (Future Requirement)

To train or validate a clinical gradability model in the future, the following dataset must be assembled:

1. **Cohort Size:** $\ge 500$ retinal fundus images with diverse image quality.
2. **Reviewers:** $\ge 2$ certified ophthalmologists or trained graders per image.
3. **Labels:** `gradable` (all features visible for DR grading), `ungradable` (unusable due to opacity/blur/lighting), `uncertain` (borderline).
4. **Dimensions:** Focus, illumination, artifact presence, optic disc visibility, macular/foveal visibility.
5. **Consensus:** Majority vote with senior clinician adjudication for disagreements.
