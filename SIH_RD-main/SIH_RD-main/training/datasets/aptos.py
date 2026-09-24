"""Safe PyTorch Dataset support for the APTOS 2019 DR competition format."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Sequence

import pandas as pd
import torch
from PIL import Image, UnidentifiedImageError
from torch.utils.data import Dataset

from training.utils.config import AptosConfig


DR_GRADE_TO_CLASS = {grade: grade for grade in range(5)}
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".tif", ".tiff")


@dataclass(frozen=True)
class AptosRecord:
    image_id: str
    image_path: Path
    label: int


@dataclass(frozen=True)
class ImageFailure:
    image_id: str
    image_path: Path
    reason: str


def _find_image_path(images_dir: Path, image_id: str) -> Path | None:
    supplied_path = images_dir / image_id
    if supplied_path.suffix and supplied_path.is_file():
        return supplied_path
    for extension in IMAGE_EXTENSIONS:
        candidate = images_dir / f"{image_id}{extension}"
        if candidate.is_file():
            return candidate
    return None


def _is_readable(image_path: Path) -> tuple[bool, str | None]:
    try:
        with Image.open(image_path) as image:
            image.verify()
        return True, None
    except (OSError, UnidentifiedImageError, ValueError) as error:
        return False, str(error)


def load_aptos_records(
    config: AptosConfig, *, validate_images: bool = True
) -> tuple[list[AptosRecord], list[ImageFailure]]:
    """Read APTOS labels and image paths, excluding invalid images safely."""

    if not config.labels_file.is_file():
        raise FileNotFoundError(f"Labels CSV was not found: {config.labels_file}")
    if not config.images_dir.is_dir():
        raise NotADirectoryError(f"Image directory was not found: {config.images_dir}")

    labels = pd.read_csv(config.labels_file)
    required_columns = {config.id_column, config.label_column}
    missing_columns = required_columns.difference(labels.columns)
    if missing_columns:
        raise ValueError(f"Labels CSV is missing required columns: {sorted(missing_columns)}")

    records: list[AptosRecord] = []
    failures: list[ImageFailure] = []
    for row in labels[[config.id_column, config.label_column]].itertuples(index=False):
        image_id, raw_label = str(row[0]), row[1]
        try:
            grade = int(raw_label)
        except (TypeError, ValueError) as error:
            raise ValueError(f"Invalid DR label for {image_id!r}: {raw_label!r}") from error
        if grade not in DR_GRADE_TO_CLASS:
            raise ValueError(f"DR label for {image_id!r} must be one of 0, 1, 2, 3, 4.")

        image_path = _find_image_path(config.images_dir, image_id)
        if image_path is None:
            failures.append(
                ImageFailure(image_id, config.images_dir / image_id, "image file is missing")
            )
            continue
        if validate_images:
            readable, reason = _is_readable(image_path)
            if not readable:
                failures.append(ImageFailure(image_id, image_path, reason or "unreadable image"))
                continue
        records.append(AptosRecord(image_id, image_path, DR_GRADE_TO_CLASS[grade]))

    if not records:
        raise ValueError("No valid APTOS images were found after validation.")
    return records, failures


class AptosDataset(Dataset[tuple[torch.Tensor, int]]):
    """A validated APTOS image dataset yielding ``(image_tensor, dr_class)``."""

    def __init__(
        self, records: Sequence[AptosRecord], transform: Callable[[Image.Image], torch.Tensor]
    ) -> None:
        if not records:
            raise ValueError("AptosDataset requires at least one valid record.")
        self.records = list(records)
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        record = self.records[index]
        try:
            with Image.open(record.image_path) as image:
                rgb_image = image.convert("RGB")
                setattr(rgb_image, "_retinal_field_crop_cache_key", str(record.image_path))
        except (OSError, UnidentifiedImageError, ValueError) as error:
            raise RuntimeError(
                f"Image became unreadable after validation: {record.image_path}"
            ) from error
        return self.transform(rgb_image), record.label
