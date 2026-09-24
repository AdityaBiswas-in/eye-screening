# APTOS 2019 Dataset Pipeline

## Expected directory structure

Place the APTOS files in a directory chosen by you; the pipeline does not download data or assume an absolute location.

```text
<dataset-root>/
├── train.csv
└── train_images/
    ├── <id_code>.png
    └── ...
```

The original APTOS CSV uses `id_code` and `diagnosis`. `diagnosis` must be one of `0`, `1`, `2`, `3`, or `4`, which map directly to the five DR classes. Other column names can be configured.

## Configure the data location

Copy or edit `configs/aptos_dataset.toml` and set `dataset_root` to your data directory. Alternatively, keep the configuration portable and set an environment variable:

```bash
export APTOS_DATASET_ROOT="/path/to/aptos-2019"
```

`APTOS_DATASET_ROOT` takes precedence over `dataset_root`. `labels_file`, `images_dir`, column names, validation fraction, and seed are configured in the same TOML file. Relative `labels_file` and `images_dir` values are resolved from the configured dataset root.

## Inspect the dataset

From the project root, run:

```bash
python3 scripts/inspect_aptos_dataset.py --config configs/aptos_dataset.toml
```

The report includes valid-image count, DR-grade distributions, reproducible train/validation sizes and distributions, and missing/corrupt image failures. It validates each image before splitting.

## Run the smoke test

The smoke test creates a temporary local miniature dataset; it does not need the APTOS dataset or network access.

```bash
python3 tests/unit/test_aptos_dataset_smoke.py
```

It checks Dataset and DataLoader batch creation, 384×384 tensor shape, finite pixel values, valid labels, and repeatable stratified splitting.
