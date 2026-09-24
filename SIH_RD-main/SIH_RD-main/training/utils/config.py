"""Configuration loading for the APTOS dataset pipeline."""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "configs" / "aptos_dataset.toml"


@dataclass(frozen=True)
class AptosConfig:
    """Resolved configuration needed to read and split an APTOS dataset."""

    dataset_root: Path
    labels_file: Path
    images_dir: Path
    id_column: str
    label_column: str
    validation_fraction: float
    seed: int


def _resolve_path(value: str, base_dir: Path) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else (base_dir / path).resolve()


def load_aptos_config(config_path: str | Path | None = None) -> AptosConfig:
    """Load APTOS settings from TOML and environment variables.

    ``APTOS_DATASET_ROOT`` overrides ``dataset_root`` in the TOML file. No
    dataset location is assumed by this module; one of those values is required.
    """

    source_path = Path(
        config_path or os.environ.get("APTOS_CONFIG", DEFAULT_CONFIG_PATH)
    ).expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(f"APTOS configuration was not found: {source_path}")

    with source_path.open("rb") as config_file:
        settings: dict[str, Any] = tomllib.load(config_file).get("aptos", {})

    dataset_root_value = os.environ.get("APTOS_DATASET_ROOT") or settings.get(
        "dataset_root", ""
    )
    if not dataset_root_value:
        raise ValueError(
            "Set APTOS_DATASET_ROOT or dataset_root in the APTOS configuration."
        )

    dataset_root = _resolve_path(str(dataset_root_value), source_path.parent)
    labels_value = str(settings.get("labels_file", "train.csv"))
    images_value = str(settings.get("images_dir", "train_images"))
    labels_file = _resolve_path(labels_value, dataset_root)
    images_dir = _resolve_path(images_value, dataset_root)
    validation_fraction = float(settings.get("validation_fraction", 0.2))
    if not 0.0 < validation_fraction < 1.0:
        raise ValueError("validation_fraction must be between 0 and 1.")

    return AptosConfig(
        dataset_root=dataset_root,
        labels_file=labels_file,
        images_dir=images_dir,
        id_column=str(settings.get("id_column", "id_code")),
        label_column=str(settings.get("label_column", "diagnosis")),
        validation_fraction=validation_fraction,
        seed=int(settings.get("seed", 42)),
    )
