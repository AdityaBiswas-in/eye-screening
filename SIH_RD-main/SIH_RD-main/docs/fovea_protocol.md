# Fovea Localization Protocol & Data Discrepancy

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** DATA UNAVAILABLE / NOT IMPLEMENTED (DOCUMENTATION DISCREPANCY)  
**Last updated:** 2026-09-24  

---

## 1. Documented vs Verified Data Discrepancy (TODO / VERIFY)

> [!IMPORTANT]
> **Data Discrepancy Summary:**
> - `docs/dataset_protocol.md` states: *"Optic-disc and fovea center coordinates are available for all 516 IDRiD images."*
> - **Local Filesystem Audit Result:** NO fovea coordinate file (`.csv`, `.json`, `.txt`, `.mat`) exists on the local filesystem.
> - Disease grading CSV files (`data/idrid/B. Disease Grading/1. Original Images/a. Training Set/` and `b. Testing Set/`) contain ONLY `Image name`, `Retinopathy grade`, and `Risk of macular edema`.
> - Fovea data is documented as available in project specification but is **locally unavailable**.

---

## 2. Policy: Zero Fabrication

1. **DO NOT fabricate** fovea center coordinates.
2. **DO NOT infer** fovea coordinates from optic disc position and label them ground-truth.
3. **DO NOT train** a fovea model using fake labels.
4. **DO NOT silently modify** project documentation to hide the discrepancy.

---

## 3. API Response Contract

```json
{
  "structures": {
    "fovea": {
      "status": "not_implemented",
      "data_available": false,
      "blocker": "IDRiD fovea center coordinates are not present in the local data directory. The dataset protocol notes these coordinates should be available for 516 images but they have not been acquired.",
      "center": null,
      "confidence": null
    }
  }
}
```

---

## 4. Remediation Steps Required

1. Acquire the official IDRiD `Sub-location annotations` file containing fovea center $(X, Y)$ coordinates for the 516 images.
2. Verify coordinate reference frame (image pixel space vs normalized coordinates).
3. Train a dedicated lightweight fovea localization regression model.
