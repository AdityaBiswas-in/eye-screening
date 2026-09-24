# Explanation Validation Protocol

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** EXPERIMENTAL / NOT CLINICALLY VALIDATED  
**Last updated:** 2026-09-24  

---

## 1. Scope & Objective

This protocol defines the research evaluation suite for model attribution (Grad-CAM and lesion activation maps).
It explicitly separates **model faithfulness and attribution agreement** from **clinical explanation validity**.

---

## 2. Evaluation Suite Modules

| Module | Location | Purpose | Key Metric |
| :--- | :--- | :--- | :--- |
| **Localization Agreement** | `training/explainability/localization_eval.py` | Compares Grad-CAM with IDRiD lesion masks | IoU at 50th percentile threshold, Pointing-game accuracy, Overlap fraction |
| **Fidelity Evaluation** | `training/explainability/fidelity_eval.py` | Measures prediction confidence change under attribution masking | AUC deletion curve, AUC insertion curve, $\Delta\text{confidence}_{50\%}$ |
| **Stability Evaluation** | `training/explainability/stability_eval.py` | Measures Grad-CAM stability under 6 explicit image perturbations | Cosine similarity across perturbations |
| **Consistency Evaluation** | `training/explainability/consistency_eval.py` | Measures rank correlation between DR grade and lesion activations | Spearman rank correlation ($\rho$) |

---

## 3. Explicit Perturbations for Stability

1. `brightness_plus10`: $+10/255$ intensity shift
2. `brightness_minus10`: $-10/255$ intensity shift
3. `contrast_plus10pct`: $1.10\times$ contrast scaling
4. `contrast_minus10pct`: $0.90\times$ contrast scaling
5. `translation_5px_right`: 5-pixel right shift
6. `gaussian_noise_sigma2`: Gaussian noise $\sigma = 2/255$

---

## 4. API Status Field

```json
{
  "explainability": {
    "method": "Grad-CAM",
    "target_layer": "encoder.7",
    "overlay_png_base64": "...",
    "localization_validation": { "status": "experimental_eval_utility", "module": "training/explainability/localization_eval.py" },
    "fidelity_validation": { "status": "experimental_eval_utility", "module": "training/explainability/fidelity_eval.py" },
    "stability_validation": { "status": "experimental_eval_utility", "module": "training/explainability/stability_eval.py" },
    "consistency_validation": { "status": "experimental_eval_utility", "module": "training/explainability/consistency_eval.py" },
    "clinical_validation_status": "not_conducted",
    "note": "Grad-CAM and lesion activations are model attributions only, NOT clinical diagnostic evidence."
  }
}
```
