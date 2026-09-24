"""Create a deterministic exploratory IQA feature table for local APTOS images."""

from __future__ import annotations

import argparse
import csv
import math
import os
import sys
import tomllib
from collections.abc import Sequence
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.aptos import AptosRecord, load_aptos_records
from training.quality import compute_quality_features
from training.utils.config import AptosConfig


FULL_APTOS_TRAINING_COUNT = 3662
FEATURE_TABLE_COLUMNS = (
    "image_id",
    "label",
    "width",
    "height",
    "aspect_ratio",
    "mode",
    "sharpness_laplacian_variance",
    "retinal_field_coverage",
    "mean_luminance",
    "luminance_stddev",
    "luminance_p05",
    "luminance_p95",
    "illumination_nonuniformity",
    "dark_pixel_fraction",
    "saturated_pixel_fraction",
    "background_pixel_fraction",
)
NUMERIC_FEATURE_COLUMNS = tuple(
    column
    for column in FEATURE_TABLE_COLUMNS
    if column not in {"image_id", "mode"}
)


def _dataset_root_from_config() -> Path:
    """Resolve APTOS root via environment, datasets config, then local scaffold."""

    config_path = PROJECT_ROOT / "configs" / "datasets.toml"
    with config_path.open("rb") as config_file:
        spec = tomllib.load(config_file)["datasets"]["aptos_2019"]
    configured_root = os.environ.get(spec["root_path_env"]) or spec.get("root_path", "")
    if configured_root:
        path = Path(configured_root).expanduser()
        return path if path.is_absolute() else (config_path.parent / path).resolve()
    return PROJECT_ROOT / "data" / "aptos" / "aptos2019"


def build_feature_rows(
    records: Sequence[AptosRecord],
    limit: int | None = None,
    progress_callback: Callable[[int, int], None] | None = None,
) -> list[dict[str, int | float | str]]:
    """Compute rows in deterministic image-ID order without changing source data."""

    selected_records = sorted(records, key=lambda record: record.image_id)
    if limit is not None:
        selected_records = selected_records[:limit]
    rows: list[dict[str, int | float | str]] = []
    for position, record in enumerate(selected_records, start=1):
        with Image.open(record.image_path) as image:
            features = compute_quality_features(image)
        rows.append(
            {
                "image_id": record.image_id,
                "label": record.label,
                "width": features.width,
                "height": features.height,
                "aspect_ratio": features.aspect_ratio,
                "mode": features.rgb_mode,
                "sharpness_laplacian_variance": features.sharpness_laplacian_variance,
                "retinal_field_coverage": features.retinal_field_coverage,
                "mean_luminance": features.mean_luminance,
                "luminance_stddev": features.luminance_stddev,
                "luminance_p05": features.luminance_p05,
                "luminance_p95": features.luminance_p95,
                "illumination_nonuniformity": features.illumination_nonuniformity,
                "dark_pixel_fraction": features.dark_pixel_fraction,
                "saturated_pixel_fraction": features.saturated_pixel_fraction,
                "background_pixel_fraction": features.background_pixel_fraction,
            }
        )
        if progress_callback is not None and (
            position == len(selected_records) or position % 100 == 0
        ):
            progress_callback(position, len(selected_records))
    validate_feature_rows(rows, expected_count=limit if limit is not None else FULL_APTOS_TRAINING_COUNT)
    return rows


def validate_feature_rows(
    rows: Sequence[dict[str, int | float | str]], expected_count: int | None = None
) -> None:
    """Validate schema, IDs, labels, deterministic order, and finite numerics."""

    if expected_count is not None and len(rows) != expected_count:
        raise ValueError(f"Expected {expected_count} feature rows, found {len(rows)}.")
    image_ids = [str(row.get("image_id", "")) for row in rows]
    if not all(image_ids):
        raise ValueError("Feature table contains a missing image_id.")
    if len(image_ids) != len(set(image_ids)):
        raise ValueError("Feature table contains duplicate image_id values.")
    if image_ids != sorted(image_ids):
        raise ValueError("Feature table rows must be ordered by image_id.")
    for row in rows:
        if tuple(row.keys()) != FEATURE_TABLE_COLUMNS:
            raise ValueError("Feature table row schema does not match the required columns.")
        label = row["label"]
        if not isinstance(label, int) or label not in range(5):
            raise ValueError(f"Feature table has missing or invalid label for {row['image_id']!r}.")
        if row["mode"] != "RGB":
            raise ValueError(f"Feature table row for {row['image_id']!r} is not RGB.")
        for column in NUMERIC_FEATURE_COLUMNS:
            value = row[column]
            if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
                raise ValueError(f"Feature table has non-finite {column} for {row['image_id']!r}.")


def write_feature_table(
    rows: Sequence[dict[str, int | float | str]], output_path: Path, *, overwrite: bool = False
) -> None:
    """Write a validated feature table without overwriting an existing file by default."""

    validate_feature_rows(rows)
    if output_path.exists() and not overwrite:
        raise FileExistsError(
            f"Output already exists: {output_path}. Pass --overwrite to replace it."
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=FEATURE_TABLE_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def _summarize(values: list[float]) -> dict[str, float]:
    array = np.asarray(values, dtype=np.float64)
    return {
        "count": float(array.size),
        "mean": float(np.mean(array)),
        "std": float(np.std(array)),
        "p05": float(np.percentile(array, 5)),
        "p50": float(np.percentile(array, 50)),
        "p95": float(np.percentile(array, 95)),
        "min": float(np.min(array)),
        "max": float(np.max(array)),
    }


def print_summary(rows: Sequence[dict[str, int | float | str]]) -> None:
    """Print descriptive statistics without assigning quality labels."""

    print(f"APTOS records analyzed: {len(rows)}")
    print("No gradability labels, quality thresholds, or good/bad assignments are produced.")
    for column in NUMERIC_FEATURE_COLUMNS:
        print(f"{column}: {_summarize([float(row[column]) for row in rows])}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Inspect at most this many records.")
    parser.add_argument("--dataset-root", type=Path, help="Override configured APTOS root.")
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "data" / "aptos" / "aptos_quality_features.csv",
        help="CSV destination for the deterministic exploratory feature table.",
    )
    parser.add_argument("--overwrite", action="store_true", help="Allow replacement of --output.")
    arguments = parser.parse_args()
    if arguments.limit is not None and arguments.limit <= 0:
        parser.error("--limit must be positive.")

    root = (arguments.dataset_root or _dataset_root_from_config()).resolve()
    config = AptosConfig(
        dataset_root=root,
        labels_file=root / "train.csv",
        images_dir=root / "train_images",
        id_column="id_code",
        label_column="diagnosis",
        validation_fraction=0.15,
        seed=42,
    )
    records, failures = load_aptos_records(config, validate_images=True)
    if arguments.limit is None and len(records) != FULL_APTOS_TRAINING_COUNT:
        raise ValueError(
            f"Expected {FULL_APTOS_TRAINING_COUNT} valid APTOS records, found {len(records)}."
        )
    print(f"Computing deterministic quality features for {len(records) if arguments.limit is None else arguments.limit} records...", flush=True)
    rows = build_feature_rows(
        records,
        limit=arguments.limit,
        progress_callback=lambda current, total: print(
            f"processed: {current}/{total}", flush=True
        ),
    )
    write_feature_table(rows, arguments.output, overwrite=arguments.overwrite)
    print(f"Pre-validation image failures excluded: {len(failures)}")
    print(f"feature table: {arguments.output}")
    print_summary(rows)


if __name__ == "__main__":
    main()
