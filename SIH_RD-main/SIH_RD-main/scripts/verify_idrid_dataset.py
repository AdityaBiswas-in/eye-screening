from __future__ import annotations

import csv
from pathlib import Path
from collections import Counter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
IDRID_ROOT = PROJECT_ROOT / "data" / "idrid"

SEG_ROOT = (
    IDRID_ROOT
    / "A. Segmentation"
    / "2. All Segmentation Groundtruths"
)

IMG_ROOT = (
    IDRID_ROOT
    / "B. Disease Grading"
    / "1. Original Images"
)

GT_ROOT = (
    IDRID_ROOT
    / "B. Disease Grading"
    / "2. Groundtruths"
)

LESION_DIRS = {
    "MA": "1. Microaneurysms",
    "HE": "2. Haemorrhages",
    "EX": "3. Hard Exudates",
    "SE": "4. Soft Exudates",
    "OD": "5. Optic Disc",
}


def image_id_from_name(path: Path) -> str:
    stem = path.stem

    for suffix in ("_MA", "_HE", "_EX", "_SE", "_OD"):
        if stem.endswith(suffix):
            stem = stem[: -len(suffix)]

    prefix, number = stem.rsplit("_", 1)
    return f"{prefix}_{int(number):02d}"


def collect_files(directory: Path, extensions: tuple[str, ...]) -> list[Path]:
    if not directory.exists():
        return []

    return sorted(
        p
        for p in directory.rglob("*")
        if p.is_file() and p.suffix.lower() in extensions
    )


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def inspect_grading_csv(path: Path) -> None:
    print()
    print("=" * 72)
    print(f"GRADING LABELS: {path.name}")
    print("=" * 72)

    print("Path:", path)
    print("Exists:", path.exists())

    if not path.exists():
        return

    rows = read_csv(path)

    print("Rows:", len(rows))

    if not rows:
        return

    print("Columns:", list(rows[0].keys()))

    for key in rows[0].keys():
        values = [row[key] for row in rows]
        unique = sorted(set(values))

        if len(unique) <= 20:
            print(f"{key}: {unique}")

    grade_column = None

    for candidate in (
        "Retinopathy grade",
        "retinopathy grade",
        "diagnosis",
        "grade",
    ):
        if candidate in rows[0]:
            grade_column = candidate
            break

    if grade_column:
        counts = Counter(row[grade_column] for row in rows)
        print("Grade column:", grade_column)
        print("Grade counts:", dict(sorted(counts.items())))


def inspect_images() -> dict[str, set[str]]:
    print()
    print("=" * 72)
    print("DISEASE-GRADING IMAGES")
    print("=" * 72)

    result: dict[str, set[str]] = {}

    for split, folder in [
    ("training", "a. Training Set"),
    ("testing", "b. Testing Set"),
]:
        directory = IMG_ROOT / folder

        files = collect_files(
            directory,
            (".jpg", ".jpeg", ".png", ".tif", ".tiff"),
        )

        ids = {image_id_from_name(p) for p in files}

        result[split] = ids

        print(f"\n{split.upper()}")
        print("Directory:", directory)
        print("Exists:", directory.exists())
        print("Files:", len(files))
        print("Unique IDs:", len(ids))

    return result


def inspect_masks() -> dict[str, dict[str, set[str]]]:
    print()
    print("=" * 72)
    print("SEGMENTATION MASKS")
    print("=" * 72)

    result: dict[str, dict[str, set[str]]] = {}

    for split, folder in [
        ("training", "a. Training Set"),
        ("testing", "b. Testing Set"),
    ]:
        result[split] = {}

        print(f"\n{split.upper()}")

        for lesion, lesion_folder in LESION_DIRS.items():
            directory = SEG_ROOT / folder / lesion_folder

            files = collect_files(
                directory,
                (".tif", ".tiff", ".png"),
            )

            ids = {image_id_from_name(p) for p in files}

            result[split][lesion] = ids

            print(
                f"{lesion}: "
                f"directory_exists={directory.exists()}, "
                f"files={len(files)}, "
                f"unique_ids={len(ids)}"
            )

    return result


def inspect_coverage(
    image_ids: dict[str, set[str]],
    masks: dict[str, dict[str, set[str]]],
) -> None:
    print()
    print("=" * 72)
    print("LESION-SUPERVISION COVERAGE")
    print("=" * 72)

    for split in ("training", "testing"):
        images = image_ids[split]

        print(f"\n{split.upper()}")

        lesion_sets = [
            masks[split][x]
            for x in ("MA", "HE", "EX", "SE")
        ]

        complete = set.intersection(*lesion_sets) & images

        print("Images:", len(images))
        print("Complete MA+HE+EX+SE:", len(complete))

        for lesion in ("MA", "HE", "EX", "SE", "OD"):
            available = images & masks[split][lesion]

            print(
                f"{lesion}: "
                f"{len(available)} available, "
                f"{len(images - masks[split][lesion])} missing"
            )


def inspect_overlap(
    image_ids: dict[str, set[str]],
    masks: dict[str, dict[str, set[str]]],
) -> None:
    print()
    print("=" * 72)
    print("TRAIN/TEST OVERLAP")
    print("=" * 72)

    overlap = image_ids["training"] & image_ids["testing"]

    print("Image-ID overlap:", len(overlap))

    for lesion in LESION_DIRS:
        overlap = (
            masks["training"][lesion]
            & masks["testing"][lesion]
        )

        print(f"{lesion} mask-ID overlap:", len(overlap))


def main() -> None:
    print("=" * 72)
    print("IDRiD DATASET VERIFICATION")
    print("=" * 72)

    print("Project root:", PROJECT_ROOT)
    print("IDRiD root:", IDRID_ROOT)

    image_ids = inspect_images()

    inspect_grading_csv(
        GT_ROOT / "a. IDRiD_Disease Grading_Training Labels.csv"
    )

    inspect_grading_csv(
        GT_ROOT / "b. IDRiD_Disease Grading_Testing Labels.csv"
    )

    masks = inspect_masks()

    inspect_coverage(image_ids, masks)
    inspect_overlap(image_ids, masks)

    print()
    print("=" * 72)
    print("VERIFICATION COMPLETE")
    print("=" * 72)


if __name__ == "__main__":
    main()