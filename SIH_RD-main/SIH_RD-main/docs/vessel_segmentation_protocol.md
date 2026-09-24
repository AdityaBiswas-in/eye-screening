# Retinal Vessel Segmentation Protocol

**Project:** SIH-26038 (Explainable AI for Diabetic Retinopathy Screening in Rural India)  
**Status:** DATA UNAVAILABLE / NOT IMPLEMENTED  
**Last updated:** 2026-09-24  

---

## 1. Verified Data Status

The DRIVE (Digital Retinal Images for Vessel Extraction) dataset is **not present locally**.
- Filesystem audit: `data/drive/README.md` exists as documentation only.
- No image files (`.tif`, `.png`, `.jpg`) or ground-truth vessel masks (`.gif`, `.png`) exist locally.

---

## 2. API Response Contract

```json
{
  "structures": {
    "vessels": {
      "status": "not_implemented",
      "data_available": false,
      "blocker": "DRIVE dataset is not downloaded locally (only README exists at data/drive/README.md). Acquire DRIVE images and vessel masks from https://drive.grand-challenge.org/ before implementing vessel segmentation.",
      "mask": null
    }
  }
}
```

---

## 3. Future Integration Requirements

If the DRIVE dataset is acquired in the future:
1. **Model:** Train a separate U-Net or light segmentation architecture on DRIVE training set (20 images).
2. **Evaluation:** Measure Dice coefficient and IoU against DRIVE test set (20 images).
3. **Execution:** Run as an auxiliary module separate from the frozen E9 model. Do NOT retrain E9.
