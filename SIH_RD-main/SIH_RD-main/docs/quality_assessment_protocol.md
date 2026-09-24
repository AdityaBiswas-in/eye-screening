# Image Quality Assessment Feature Protocol

## Scope

This module computes deterministic image-level features from an in-memory PIL image. It does not train an IQA network, produce a clinical gradability label, reject an image, calibrate a threshold, or modify image files.

## Measurable features

- **Sharpness/focus proxy:** variance of a four-neighbour discrete luminance Laplacian. It measures high-frequency variation and is not proof of focus quality or clinical gradability.
- **Retinal-field coverage:** fraction of pixels whose maximum RGB intensity exceeds the same conservative low-intensity background criterion used by the baseline field handler. It measures coverage, not retinal anatomy or artifact type.
- **Illumination:** mean luminance, luminance standard deviation, 5th and 95th percentile luminance, and quadrant-mean standard deviation as a coarse non-uniformity indicator. None is labeled good or bad.
- **Pixel-distribution indicators:** fractions of very dark pixels, high-luminance pixels, and background-classified pixels. These do not establish that a pixel is an artifact.
- **Metadata:** width, height, aspect ratio, and post-conversion RGB mode.

## Clinical gradability is not implemented

Measured features must not be treated as clinical gradability labels or image rejection rules. Future work needs verified quality labels, calibration, validation by acquisition domain, and a clinically reviewed safe-response policy.

## Quality-guided preprocessing

The preprocessing baseline can preserve raw RGB input separately from model-ready tensors. These features are currently informational only; they do not alter preprocessing, Dataset behavior, labels, manifests, or the locked APTOS split.

## Not implemented

- IQA neural network or learned gradability classifier
- quality thresholds, good/bad labels, or automatic rejection
- clinical validation

TODO: determine, with verified annotation sources and ablation studies, whether and how these features should inform future quality assessment and quality-guided preprocessing.

## Exploratory APTOS feature table

`scripts/analyze_aptos_quality.py` can save a deterministic, image-ID-sorted CSV table at `data/aptos/aptos_quality_features.csv` by default. It contains the original image ID and DR label alongside measured IQA features and metadata. The table is exploratory analysis output, **not clinical quality ground truth** and not an approved model input or rejection rule.

Thresholds cannot be inferred from feature distributions alone. Future quality labels must have independently verified provenance, definitions, coverage, and clinical review before they can support threshold calibration, a quality model, or any gradability decision.
