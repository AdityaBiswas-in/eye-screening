# Dataset Manifest Schema

A manifest is created only after a locally acquired dataset has been inspected and verified. This document specifies the future manifest; it does not generate one and makes no assertion that any local dataset is verified.

## Record schema

Each record represents one image and should contain:

| Field | Meaning |
|---|---|
| `dataset` | Dataset identifier, such as `aptos_2019`, `idrid`, `drive`, or `messidor_2`. |
| `relative_image_path` | Path relative to the configured dataset root; never an absolute machine-specific path. |
| `image_filename` | Image basename. |
| `extension` | Image suffix. |
| `width`, `height`, `channels` | Safely inspected image properties. |
| `label` | Official image-level label, if officially available and verified; otherwise `null`. |
| `annotation_availability` | Available verified annotation types for the image. |
| `lesion_annotation_availability` | Lesion mask/annotation status; do not infer it from a grade label. |
| `vessel_annotation_availability` | Vessel-mask status. |
| `patient_or_examination_id` | Official identifier only when available and verified; otherwise `null`. |
| `split` | Dataset-provided or project partition, with provenance. |
| `checksum` | File hash and named algorithm, computed from the local image file. |
| `verification_status` | `NOT_DOWNLOADED`, `INSPECTED`, `VERIFIED`, or a documented failure state. |

## Manifest metadata

Record the dataset source URL, release/version, acquisition date, license/terms review status, configured-root identifier (not an absolute path), manifest-generation tool version, exclusions, duplicate-audit method, and an immutable manifest checksum.

Manifest generation must not alter source images or annotations. It must preserve the protocol constraints: partial IDRiD lesion labels, DRIVE test-ground-truth limitation, and the absence of official Messidor-2 DR ground truth.
