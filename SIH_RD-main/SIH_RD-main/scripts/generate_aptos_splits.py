"""Generate and validate a reproducible APTOS train/validation/test manifest."""

from __future__ import annotations

import argparse
import csv
import sys
import tomllib
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.splits import make_three_way_stratified_split  # noqa: E402


TRAIN_FRACTION = 0.70
VALIDATION_FRACTION = 0.15
TEST_FRACTION = 0.15
IMAGE_EXTENSIONS = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}


@dataclass(frozen=True)
class AptosTrainingRow:
    """One original APTOS training CSV row used for split assignment."""

    id_code: str
    diagnosis: int


def load_project_seed(project_config_path: Path) -> int:
    """Read the project-wide deterministic split seed from TOML."""

    with project_config_path.open("rb") as config_file:
        project_config = tomllib.load(config_file)
    try:
        return int(project_config["reproducibility"]["split_seed"])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError(
            f"Missing or invalid reproducibility.split_seed in {project_config_path}"
        ) from error


def read_aptos_training_rows(train_csv_path: Path) -> list[AptosTrainingRow]:
    """Read and validate the required APTOS ``id_code`` and ``diagnosis`` columns."""

    if not train_csv_path.is_file():
        raise FileNotFoundError(f"APTOS training CSV was not found: {train_csv_path}")
    with train_csv_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None or not {"id_code", "diagnosis"}.issubset(reader.fieldnames):
            raise ValueError("APTOS train.csv must contain id_code and diagnosis columns.")
        rows: list[AptosTrainingRow] = []
        for row_number, row in enumerate(reader, start=2):
            image_id = (row.get("id_code") or "").strip()
            raw_diagnosis = row.get("diagnosis")
            if not image_id:
                raise ValueError(f"Missing id_code at CSV row {row_number}.")
            try:
                diagnosis = int(raw_diagnosis) if raw_diagnosis is not None else -1
            except ValueError as error:
                raise ValueError(f"Invalid diagnosis at CSV row {row_number}: {raw_diagnosis!r}") from error
            if diagnosis not in range(5):
                raise ValueError(f"Diagnosis at CSV row {row_number} must be in [0, 1, 2, 3, 4].")
            rows.append(AptosTrainingRow(image_id, diagnosis))

    duplicate_ids = [image_id for image_id, count in Counter(row.id_code for row in rows).items() if count > 1]
    if duplicate_ids:
        raise ValueError(f"Duplicate id_code values in train.csv: {sorted(duplicate_ids)[:10]}")
    if not rows:
        raise ValueError("APTOS train.csv contains no training rows.")
    return rows


def validate_training_image_alignment(rows: Iterable[AptosTrainingRow], images_dir: Path) -> None:
    """Require a one-to-one mapping between original APTOS CSV IDs and images."""

    if not images_dir.is_dir():
        raise NotADirectoryError(f"APTOS training image directory was not found: {images_dir}")
    image_paths = [
        path
        for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    stems = Counter(path.stem for path in image_paths)
    duplicate_stems = sorted(stem for stem, count in stems.items() if count > 1)
    if duplicate_stems:
        raise ValueError(f"Duplicate training image IDs: {duplicate_stems[:10]}")
    csv_ids = {row.id_code for row in rows}
    image_ids = set(stems)
    missing_images = sorted(csv_ids.difference(image_ids))
    unexpected_images = sorted(image_ids.difference(csv_ids))
    if missing_images or unexpected_images:
        details: list[str] = []
        if missing_images:
            details.append(f"missing images for CSV IDs: {missing_images[:10]}")
        if unexpected_images:
            details.append(f"images without CSV IDs: {unexpected_images[:10]}")
        raise ValueError("APTOS CSV/image alignment failed; " + "; ".join(details))


def validate_manifest(manifest_path: Path, rows: Iterable[AptosTrainingRow]) -> None:
    """Verify every source image ID is represented once with its original diagnosis."""

    source_diagnoses = {row.id_code: row.diagnosis for row in rows}
    with manifest_path.open(newline="", encoding="utf-8") as manifest_file:
        reader = csv.DictReader(manifest_file)
        if reader.fieldnames != ["id_code", "diagnosis", "split"]:
            raise ValueError("Manifest must contain exactly id_code, diagnosis, split columns.")
        manifest_rows = list(reader)

    manifest_ids = [row.get("id_code", "") for row in manifest_rows]
    duplicate_ids = sorted(image_id for image_id, count in Counter(manifest_ids).items() if count > 1)
    if duplicate_ids:
        raise ValueError(f"Manifest contains duplicate id_code values: {duplicate_ids[:10]}")
    if set(manifest_ids) != set(source_diagnoses):
        raise ValueError("Manifest IDs do not exactly match APTOS training CSV IDs.")
    for manifest_row in manifest_rows:
        image_id = manifest_row["id_code"]
        try:
            diagnosis = int(manifest_row["diagnosis"])
        except ValueError as error:
            raise ValueError(f"Invalid manifest diagnosis for {image_id!r}.") from error
        if diagnosis != source_diagnoses[image_id]:
            raise ValueError(f"Manifest diagnosis differs from train.csv for {image_id!r}.")
        if manifest_row["split"] not in {"train", "validation", "test"}:
            raise ValueError(f"Invalid manifest split for {image_id!r}.")


def generate_manifest(dataset_root: Path, manifest_path: Path, seed: int) -> Counter[str]:
    """Create a 70/15/15 manifest without copying or changing source images."""

    rows = read_aptos_training_rows(dataset_root / "train.csv")
    validate_training_image_alignment(rows, dataset_root / "train_images")
    split = make_three_way_stratified_split(
        rows,
        [row.diagnosis for row in rows],
        TRAIN_FRACTION,
        VALIDATION_FRACTION,
        TEST_FRACTION,
        seed,
    )
    split_by_index = {
        **{index: "train" for index in split.train_indices},
        **{index: "validation" for index in split.validation_indices},
        **{index: "test" for index in split.test_indices},
    }
    if len(split_by_index) != len(rows):
        raise ValueError("Split generation did not assign every APTOS training row exactly once.")

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", newline="", encoding="utf-8") as manifest_file:
        writer = csv.DictWriter(manifest_file, fieldnames=["id_code", "diagnosis", "split"])
        writer.writeheader()
        for index, row in enumerate(rows):
            writer.writerow(
                {"id_code": row.id_code, "diagnosis": row.diagnosis, "split": split_by_index[index]}
            )
    validate_manifest(manifest_path, rows)
    return Counter(split_by_index.values())


def _split_class_counts(manifest_path: Path) -> dict[str, dict[int, int]]:
    counts: dict[str, Counter[int]] = {
        "train": Counter(),
        "validation": Counter(),
        "test": Counter(),
    }
    with manifest_path.open(newline="", encoding="utf-8") as manifest_file:
        for row in csv.DictReader(manifest_file):
            counts[row["split"]][int(row["diagnosis"])] += 1
    return {split: {grade: counts[split][grade] for grade in range(5)} for split in counts}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-root",
        type=Path,
        default=PROJECT_ROOT / "data" / "aptos" / "aptos2019",
        help="APTOS directory containing train.csv and train_images/.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv",
        help="Destination CSV manifest; source images are never copied.",
    )
    parser.add_argument(
        "--project-config",
        type=Path,
        default=PROJECT_ROOT / "configs" / "project.toml",
        help="Project TOML providing reproducibility.split_seed.",
    )
    arguments = parser.parse_args()
    seed = load_project_seed(arguments.project_config)
    split_sizes = generate_manifest(arguments.dataset_root, arguments.manifest, seed)
    print(f"manifest: {arguments.manifest}")
    print(f"seed: {seed}")
    print(f"split sizes: {dict(split_sizes)}")
    print(f"class distributions: {_split_class_counts(arguments.manifest)}")
    print("validation: every APTOS training CSV ID and training image appears exactly once.")


if __name__ == "__main__":
    main()
