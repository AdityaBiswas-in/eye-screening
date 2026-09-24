# Dataset Acquisition and Local Verification

Acquire datasets manually and legally. Do not commit raw images, labels, annotations, archives, or generated local artifacts to Git. Configure a root with the dataset-specific environment variable in `configs/datasets.toml`; if unset, `scripts/inspect_datasets.py` checks the corresponding local `data/` directory.

## APTOS 2019 Blindness Detection

- Official source: <https://www.kaggle.com/competitions/APTOS2019-blindness-detection/data>
- Acquire: the official competition data needed for approved five-class DR grading, subject to competition terms.
- Role: primary DR grading.
- Verify locally: archive/release details, directory layout, image count and formats, `train.csv` alignment, grade semantics, duplicates, corruption, and whether any patient identifiers exist.
- License/terms must be checked by the user. Do not assume patient identifiers or public competition-test labels are available.

## IDRiD

- Official sources: <https://idrid.grand-challenge.org/Data/> and <https://www.mdpi.com/2306-5729/3/3/25>
- Verified descriptor facts: 516 grading images; official 413/103 grading split; 81-image lesion subset with MA, HE, EX, and SE annotations; optic-disc masks for that subset; optic-disc/fovea information for all 516 images.
- Role: DR grading plus partial lesion/anatomical supervision.
- Verify locally: image count, official split artifacts, grade-label alignment, lesion subset coverage/counts, mask/coordinate alignment, format, corruption, and terms/license.

## DRIVE

- Official source: <https://drive.grand-challenge.org/>
- Verified descriptor facts: 40 images; 20 training images with vessel masks; FOV masks; public test vessel ground truth is unavailable.
- Role: auxiliary vessel/anatomical research, not general DR grading.
- Verify locally: training/test structure, vessel-mask and FOV-mask alignment, image format/count, corruption, and terms/license. Do not evaluate the test set without legitimately obtained official ground truth.

## Messidor-2

- Official source: <https://www.adcis.net/en/third-party/messidor2/>
- Verified descriptor facts: 874 examinations / 1748 images, paired eyes, Original PNG images, and Extension JPG images.
- Role: candidate external/domain-shift dataset requiring verified ground truth.
- **The official release does not contain DR ground-truth annotations.** Do not use third-party labels without independent verification of provenance, license, label semantics, and scientific validity.
- Verify locally: examination/image pairing, counts, PNG/JPG composition, corruption, terms/license, and—before external DR evaluation—an independently valid and legally usable ground-truth source plus mapping.

## Acquisition checklist

- [ ] Official source accessed
- [ ] Dataset legally obtained
- [ ] Terms/license checked
- [ ] Archive integrity checked
- [ ] Files extracted
- [ ] Directory structure inspected
- [ ] Image count verified
- [ ] Labels verified
- [ ] Annotation coverage verified
- [ ] No unexpected corruption
- [ ] Dataset manifest generated
- [ ] Dataset status changed from NOT_DOWNLOADED to VERIFIED
