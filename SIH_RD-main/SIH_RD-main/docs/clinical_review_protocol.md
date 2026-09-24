# Human Clinical Validation Protocol (Future Requirements)

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** NOT CONDUCTED (`clinical_human_validation = "not_conducted"`)  
**Last updated:** 2026-09-24  

---

## 1. Current Status Statement

> [!IMPORTANT]
> **No clinical validation study involving human ophthalmologists or clinical graders has been conducted.**
> Any claims of "ophthalmologist validation," "clinical safety," or "validated gradability" are false and prohibited.
> The system is a research prototype only.

---

## 2. Requirements for Real Human Clinical Validation

To perform clinical validation in compliance with regulatory and scientific standards, the following formal protocol must be executed:

1. **Qualified Graders:** Minimum of 3 certified ophthalmologists / retinal specialists.
2. **Blinded Trial Setup:**
   - **Arm A:** Fundus image only (standard clinical review).
   - **Arm B:** Fundus image + AI Grad-CAM + AI lesion evidence summary.
3. **Metrics to Measure:**
   - **Inter-rater Agreement:** Cohen's / Fleiss' Kappa ($\kappa$) between clinicians and AI.
   - **Diagnostic Accuracy & Speed:** Sensitivity, specificity, and mean review time per image (evaluating the <30s screening target).
   - **Explanation Utility:** Structured 5-point Likert scale on Grad-CAM spatial helpfulness.
   - **Disagreement Adjudication:** Panel consensus for cases where Arm A and Arm B disagree.
4. **Target Cohort:** Minimum 1,000 prospective screening images captured in rural Indian primary healthcare centers (PHCs).
