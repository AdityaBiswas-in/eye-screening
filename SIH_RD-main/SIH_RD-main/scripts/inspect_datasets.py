"""Read-only local inspection for configured SIH-26038 datasets."""

from __future__ import annotations

import argparse
import os
import tomllib
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError:  # The report remains useful if Pillow is unavailable.
    Image = None  # type: ignore[assignment]


IMAGE_EXTENSIONS = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
ANNOTATION_EXTENSIONS = {".csv", ".json", ".txt", ".xml", ".xls", ".xlsx"}
DATASET_FALLBACKS = {
    "aptos_2019": "aptos",
    "idrid": "idrid",
    "drive": "drive",
    "messidor_2": "messidor2",
}


@dataclass(frozen=True)
class DatasetReport:
    key: str
    name: str
    root: Path
    status: str
    image_count: int = 0
    relevant_files: tuple[str, ...] = ()
    label_candidates: tuple[str, ...] = ()
    extensions: dict[str, int] = field(default_factory=dict)
    dimensions: dict[str, int] = field(default_factory=dict)
    duplicate_filenames: tuple[str, ...] = ()
    expected_assets: dict[str, bool] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()


def _resolve_root(
    spec: dict[str, Any], key: str, config_path: Path, project_root: Path
) -> Path:
    environment_value = os.environ.get(str(spec.get("root_path_env", "")))
    configured_value = environment_value or str(spec.get("root_path", ""))
    if configured_value:
        path = Path(configured_value).expanduser()
        return path if path.is_absolute() else (config_path.parent / path).resolve()
    return project_root / "data" / DATASET_FALLBACKS[key]


def _read_dimensions(image_paths: list[Path]) -> tuple[dict[str, int], list[str]]:
    if Image is None:
        return {}, ["Pillow unavailable; image dimensions were not inspected."]
    dimensions: Counter[str] = Counter()
    warnings: list[str] = []
    for image_path in image_paths:
        try:
            with Image.open(image_path) as image:
                dimensions[f"{image.width}x{image.height}x{len(image.getbands())}"] += 1
        except (OSError, ValueError) as error:
            warnings.append(f"Unreadable image: {image_path.name} ({error})")
    return dict(sorted(dimensions.items())), warnings


def _expected_assets(key: str, root: Path, image_paths: list[Path]) -> dict[str, bool]:
    all_names = {path.name.lower() for path in root.rglob("*") if path.is_file()}
    assets = {"image_files": bool(image_paths)}
    if key == "aptos_2019":
        assets["train.csv"] = "train.csv" in all_names
    elif key == "idrid":
        assets["possible_label_or_annotation_file"] = any(
            suffix in ANNOTATION_EXTENSIONS for suffix in (Path(name).suffix for name in all_names)
        )
    elif key == "drive":
        assets["possible_vessel_or_mask_file"] = any(
            "mask" in name or "vessel" in name or "manual" in name for name in all_names
        )
    elif key == "messidor_2":
        assets["official_dr_ground_truth"] = False
    return assets


def inspect_dataset(key: str, spec: dict[str, Any], config_path: Path, project_root: Path) -> DatasetReport:
    root = _resolve_root(spec, key, config_path, project_root)
    name = str(spec.get("dataset_name", key))
    if not root.is_dir():
        return DatasetReport(key=key, name=name, root=root, status="NOT_FOUND")

    files = sorted(path for path in root.rglob("*") if path.is_file() and path.name != "README.md")
    if not files:
        return DatasetReport(
            key=key,
            name=name,
            root=root,
            status="NOT_DOWNLOADED",
            warnings=("No dataset files found; the tracked README is not dataset content.",),
        )

    image_paths = [path for path in files if path.suffix.lower() in IMAGE_EXTENSIONS]
    label_candidates = [
        path.relative_to(root).as_posix()
        for path in files
        if path.suffix.lower() in ANNOTATION_EXTENSIONS
        or any(token in path.name.lower() for token in ("label", "grade", "mask", "annotation"))
    ]
    extensions = Counter(path.suffix.lower() or "[no extension]" for path in files)
    name_counts = Counter(path.name for path in image_paths)
    duplicates = tuple(sorted(name for name, count in name_counts.items() if count > 1))
    dimensions, warnings = _read_dimensions(image_paths)
    if key == "messidor_2":
        warnings.append("Official Messidor-2 release has no DR ground truth; do not infer labels.")
    return DatasetReport(
        key=key,
        name=name,
        root=root,
        status="PRESENT",
        image_count=len(image_paths),
        relevant_files=tuple(path.relative_to(root).as_posix() for path in files[:25]),
        label_candidates=tuple(label_candidates[:25]),
        extensions=dict(sorted(extensions.items())),
        dimensions=dimensions,
        duplicate_filenames=duplicates,
        expected_assets=_expected_assets(key, root, image_paths),
        warnings=tuple(warnings),
    )


def inspect_datasets(
    config_path: str | Path | None = None, project_root: str | Path | None = None
) -> list[DatasetReport]:
    """Inspect configured roots without creating, changing, or downloading data."""

    resolved_project_root = Path(project_root or Path(__file__).resolve().parents[1]).resolve()
    resolved_config_path = Path(config_path or resolved_project_root / "configs" / "datasets.toml").resolve()
    if not resolved_config_path.is_file():
        raise FileNotFoundError(f"Dataset configuration was not found: {resolved_config_path}")
    with resolved_config_path.open("rb") as config_file:
        datasets = tomllib.load(config_file).get("datasets", {})
    return [
        inspect_dataset(key, spec, resolved_config_path, resolved_project_root)
        for key, spec in datasets.items()
    ]


def _format_report(report: DatasetReport) -> str:
    lines = [report.name, f"status: {report.status}", f"root: {report.root}"]
    if report.status == "PRESENT":
        lines.extend(
            [
                f"images: {report.image_count}",
                f"relevant files: {list(report.relevant_files)}",
                f"label/annotation candidates: {list(report.label_candidates)}",
                f"extensions: {report.extensions}",
                f"dimensions: {report.dimensions}",
                f"duplicate image filenames: {list(report.duplicate_filenames)}",
                f"expected assets: {report.expected_assets}",
            ]
        )
    if report.warnings:
        lines.append(f"warnings: {list(report.warnings)}")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, help="Optional path to configs/datasets.toml")
    arguments = parser.parse_args()
    print("## DATASET STATUS")
    for report in inspect_datasets(arguments.config):
        print(_format_report(report))
        print()


if __name__ == "__main__":
    main()
