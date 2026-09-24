# Neovascularization (NV) Protocol

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** DATA UNAVAILABLE / NOT IMPLEMENTED  
**Last updated:** 2026-09-24  

---

## 1. Verified Data Status

Strict filesystem and dataset audit confirmed:
- Zero verified neovascularization (NVD / NVE) annotations exist in any local dataset (APTOS 2019, IDRiD, DRIVE).
- DR Grade 4 (Proliferative DR) implies potential neovascularization, but **inferring NV from DR grade without ground-truth labels is strictly prohibited**.

---

## 2. API Response Contract

```json
{
  "structures": {
    "neovascularization": {
      "status": "not_implemented",
      "data_available": false,
      "blocker": "No verified neovascularization annotations exist in any local dataset. NV detection requires a dedicated labelled dataset with image-level or pixel-level NV annotations from an authoritative source."
    }
  }
}
```

---

## 3. Protocol Rules

1. **NO Label Fabrication:** Do NOT create pseudo-ground-truth labels from PDR grade.
2. **NO Retraining:** Do NOT attempt to extract an NV head from E9 without annotated data.
3. **Future Data Requirements:** Requires an annotated dataset (e.g. DDR, OIA-ODIR, or custom clinician annotations) specifically labeling NVD (neovascularization at disc) and NVE (neovascularization elsewhere).
