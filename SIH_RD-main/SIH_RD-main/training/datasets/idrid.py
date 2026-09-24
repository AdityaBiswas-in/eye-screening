"""
IDRiD dataset utilities for E3 lesion-aware multi-task supervision.

Important:
- DR grading labels come from the IDRiD disease-grading CSV.
- Lesion masks are independently available.
- Missing lesion annotations are NOT interpreted as negative lesions.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset


LESION_TYPES = ("ma", "he", "ex", "se")


def normalize_idrid_id(name: str) -> str:
    """Normalize IDRiD_001 / IDRiD_01 to the same canonical ID."""
    stem = Path(name).stem

    for suffix in ("_MA", "_HE", "_EX", "_SE", "_OD"):
        if stem.endswith(suffix):
            stem = stem[: -len(suffix)]

    prefix, number = stem.rsplit("_", 1)

    return f"{prefix}_{int(number):02d}"


class IDRiDDataset(Dataset):
    """
    IDRiD dataset for DR grading plus optional lesion masks.

    Each sample returns:
        image
        grade
        lesion_masks
        lesion_available
        image_id
    """

    def __init__(
        self,
        image_paths: list[Path],
        grading_csv: Path,
        segmentation_root: Path,
        transform=None,
    ) -> None:
        self.image_paths = list(image_paths)
        self.transform = transform

        grading = pd.read_csv(grading_csv)

        self.grades: dict[str, int] = {}

        for _, row in grading.iterrows():
            image_id = normalize_idrid_id(str(row["Image name"]))
            self.grades[image_id] = int(row["Retinopathy grade"])

        self.segmentation_root = Path(segmentation_root)

        self.mask_dirs = {
            "ma": self.segmentation_root / "1. Microaneurysms",
            "he": self.segmentation_root / "2. Haemorrhages",
            "ex": self.segmentation_root / "3. Hard Exudates",
            "se": self.segmentation_root / "4. Soft Exudates",
        }

        for path in self.mask_dirs.values():
            if not path.exists():
                raise FileNotFoundError(
                    f"Missing IDRiD lesion directory: {path}"
                )

        self.records = []

        for image_path in self.image_paths:
            image_id = normalize_idrid_id(image_path.name)

            if image_id not in self.grades:
                raise KeyError(
                    f"No DR grading label found for IDRiD image: {image_id}"
                )

            masks = {}

            for lesion, directory in self.mask_dirs.items():
                matches = list(directory.glob(f"{image_id}_*.tif"))

                if matches:
                    masks[lesion] = matches[0]
                else:
                    masks[lesion] = None

            self.records.append(
                {
                    "image_id": image_id,
                    "image_path": image_path,
                    "grade": self.grades[image_id],
                    "masks": masks,
                }
            )

    def __len__(self) -> int:
        return len(self.records)

    @staticmethod
    def _load_mask(
        path: Path,
        size: tuple[int, int],
    ) -> torch.Tensor:
        mask = Image.open(path).convert("L")

        # Segmentation masks require nearest-neighbour resizing.
        mask = mask.resize(
            size,
            Image.Resampling.NEAREST,
        )

        array = np.asarray(
            mask,
            dtype=np.float32,
        )

        # IDRiD masks are binary.
        array = (array > 0).astype(np.float32)

        return torch.from_numpy(array).unsqueeze(0)

    def __getitem__(self, index: int) -> dict:
        record = self.records[index]

        image = Image.open(
            record["image_path"]
        ).convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        if not isinstance(image, torch.Tensor):
            raise TypeError(
                "IDRiD image transform must return a torch.Tensor."
            )

        _, height, width = image.shape
        mask_size = (width, height)

        lesion_masks = {}
        lesion_available = {}

        for lesion in LESION_TYPES:
            mask_path = record["masks"][lesion]

            if mask_path is None:
                # Missing annotation means unavailable supervision.
                # It must NOT be treated as a negative lesion.
                lesion_masks[lesion] = torch.zeros(
                    (1, height, width),
                    dtype=torch.float32,
                )
                lesion_available[lesion] = False
                continue

            lesion_masks[lesion] = self._load_mask(
                mask_path,
                mask_size,
            )
            lesion_available[lesion] = True

        return {
            "image": image,
            "grade": torch.tensor(
                record["grade"],
                dtype=torch.long,
            ),
            "lesion_masks": lesion_masks,
            "lesion_available": lesion_available,
            "image_id": record["image_id"],
        }
