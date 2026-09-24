# Baseline Preprocessing Protocol

This is a baseline implementation, not a claim of improved DR accuracy. It operates entirely in memory and never overwrites raw image files.

## Evaluation and inference sequence

```text
raw PIL image
→ RGB conversion
→ conservative retinal-field handling
→ antialiased resize to 384 × 384
→ optional deterministic illumination normalization (disabled by default)
→ tensor conversion
→ ImageNet mean/std normalization
```

Retinal-field handling uses a low-intensity RGB mask to remove excessive black borders with retained padding. It falls back to the original RGB image when too little foreground is detected. The prior fixed center-square crop is no longer the default because it can discard peripheral retinal field based only on image geometry rather than visible content.

## Training behavior

Training first uses the same deterministic base steps, then applies only moderate augmentation: horizontal flip, a small rotation, and mild brightness/contrast variation. Validation and inference have no random augmentation and are deterministic.

## Illumination normalization and CLAHE

`ConservativeIlluminationNormalization` is an isolated, opt-in, deterministic bounded global exposure adjustment. It is disabled by default and must be evaluated through an ablation before use. It is not CLAHE.

CLAHE is intentionally not implemented or enabled in this baseline. It needs a dedicated experiment because local contrast enhancement can change lesion appearance and therefore alter both grading behavior and future XAI evidence. No OpenCV dependency is introduced for this purpose.

## Baseline versus future experiments

Baseline choices are RGB conversion, conservative field handling, 384×384 antialiased resize, ImageNet normalization, and training-only moderate augmentation. Thresholds, optional illumination normalization, CLAHE, and all quality-guided variants require experimental validation.

TODO: integrate a future image-quality assessment module and optional quality metadata without changing raw-image preservation or breaking current Dataset callers.
