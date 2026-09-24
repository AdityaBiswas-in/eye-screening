# Dataset Protocol

## 1. Purpose

Multiple datasets serve distinct, constrained roles: APTOS 2019 supports primary five-class grading; IDRiD supplies grading plus partial lesion/anatomical evidence; DRIVE supports auxiliary vessel/anatomical research; and Messidor-2 is only a candidate external/domain-shift dataset until valid DR ground truth is independently established. This protocol is an experimental plan, not a claim that every dataset can support every task.

## 2. Dataset Roles

| Dataset | Verified role and facts | Limitation relevant to protocol |
|---|---|---|
| APTOS 2019 Blindness Detection | Primary five-class clinician-rated DR grading: 0 No DR, 1 Mild, 2 Moderate, 3 Severe, 4 Proliferative DR. It contains real-world quality variation and was gathered across clinics/cameras over time. | Patient identifiers are not established; own development/validation/internal-test split remains TODO. Quality variation is not an official binary quality label. |
| IDRiD | Disease grading: 516 images, DR grades 0–4, official 413/103 grading train/test split. Lesion segmentation: 81 images only. Localization: optic-disc/fovea centers for 516 images. | Lesion labels do not cover every grading image and have unequal class availability. |
| DRIVE | Auxiliary structural dataset: 40 retinal photographs, official 20/20 split, manual vessel masks for the 20 training images, FOV masks. | It is not a general DR grading dataset. Test vessel ground truth is not publicly available. |
| Messidor-2 | Candidate external/domain-shift dataset: 874 examinations and 1748 paired macula-centered images. | Official release has no DR ground-truth annotations; external DR evaluation is TODO. |

All local paths are intentionally unpopulated in `configs/datasets.toml`; no dataset is downloaded by this project step.

## 3. Label Strategy

### Five-class DR grading

APTOS provides the primary project grade convention: `0=No DR`, `1=Mild`, `2=Moderate`, `3=Severe`, `4=Proliferative DR`. Its public competition test labels must not be assumed available. IDRiD has image-level DR and DME grading for all 516 images, with DR grades `0–4` and a dataset-provided 413/103 disease-grading split.

### IDRiD lesion segmentation and localization

IDRiD lesion annotations exist for **81 images only**, not all 516 grading images. The verified lesion classes are microaneurysms (MA, 81), hemorrhages (HE, 80), hard exudates (EX, 81), and soft exudates (SE, 40). Optic-disc masks exist for these 81 lesion-annotation images. Optic-disc and fovea center coordinates are available for all 516 images.

Consequently, the project must not assume every DR-training image has a lesion mask. Any lesion-guided component needs a carefully defined multi-task or partial-supervision strategy. The exact mechanism is a future architecture decision, not settled by this dataset protocol.

### Vessel/anatomical supervision

DRIVE is an auxiliary structural dataset, not a DR grading dataset. It has 20 training images with manual vessel segmentation, plus FOV masks; the official 20-image test set does not make vessel ground truth publicly available. Do not use that test set as a vessel evaluation set unless ground truth is legitimately obtained through the official evaluation mechanism.

### Referable DR derivation

`grade >= 2` remains the provisional protocol definition because it matches the current SIH project statement. It is not claimed to be universally clinically established. Before deriving referable DR from any non-APTOS dataset, verify that dataset’s label semantics and mapping.

## 4. Dataset Separation

- **APTOS:** define development, validation, and internal-test partitions only after the obtained data, duplicate audit, and available metadata have been inspected. Do not assume patient-level grouping until patient identifiers are verified.
- **IDRiD:** preserve the official 413/103 disease-grading train/test split as a documented dataset-provided split. Do not replace it until a specific protocol decision is made. Segmentation supervision is limited to its verified 81-image subset.
- **DRIVE:** use only as candidate auxiliary structural research data. Treat the official test vessel labels as unavailable unless officially and legitimately accessed.
- **Messidor-2:** candidate external/domain-shift data only after valid ground truth is independently verified; it cannot yet support labeled external DR testing.

## 5. Leakage Prevention

1. Check and prevent identical or near-duplicate images across all partitions.
2. Keep verified patient/examination groups together where their identifiers exist; APTOS patient metadata remains unverified.
3. Verify image/label and image/annotation alignment before use.
4. Keep IDRiD lesion masks, optic-disc masks, coordinates, and grade labels isolated to their permitted partitions; partial labels must not leak from validation/test images into training or selection.
5. Do not tune preprocessing, model choices, calibration, uncertainty, thresholds, or reliability gates on internal or external test sets.
6. Do not use external-test images, labels, or derived distribution statistics during development.

## 6. Quality Labels

APTOS includes real-world image-quality variation such as out-of-focus, underexposed, and overexposed images. This motivates quality-aware research, but it is **not** ground-truth quality supervision. Do not claim either APTOS or IDRiD provides an official binary gradable/ungradable label unless separately verified.

Before quality modeling, establish the annotation source, gradable/ungradable definition, quality dimensions, score definition, annotation coverage, and alignment to partitions.

## 7. Known Dataset Limitations

- **APTOS:** use is subject to competition terms; patient-level metadata, exact local release layout, image format, duplicate status, and non-grade annotations remain unverified locally.
- **IDRiD:** partial lesion labels with unequal availability (especially HE=80 and SE=40) prevent an assumption of complete lesion supervision. The source reports adequate image quality and no duplicates within the dataset.
- **DRIVE:** only 40 images; its intended role is structural research, not general DR grading. Public vessel ground truth is limited to the training set.
- **Messidor-2:** **official release does not contain DR ground-truth annotations. Third-party labels must be independently verified for provenance, license, label semantics, and scientific validity before use.**

## 8. Dataset Verification Checklist

- [ ] Dataset obtained through the documented official source; license/terms and release version recorded.
- [ ] Local directory structure, image count, format, and decode status verified.
- [ ] Image-grade, image-mask, and image-coordinate alignment verified.
- [ ] Duplicate and near-duplicate audit completed.
- [ ] APTOS patient/group metadata availability checked; split policy finalized only afterward.
- [ ] IDRiD official 413/103 grading split and 81-image partial lesion subset verified locally.
- [ ] IDRiD lesion class counts and optic-disc/fovea assets verified locally.
- [ ] DRIVE training vessel masks and FOV masks verified; test-ground-truth access status recorded.
- [ ] Independently valid, legally usable Messidor-2 DR ground truth and mapping verified before any external DR metric.
- [ ] Quality-label source and definition verified before quality-supervised experiments.
- [ ] Partition manifests versioned and leakage checks passed.
