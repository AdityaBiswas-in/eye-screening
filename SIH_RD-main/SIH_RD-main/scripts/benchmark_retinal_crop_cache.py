"""Measure first and repeated deterministic retinal crop calls for one APTOS sample."""

from __future__ import annotations

import sys
import time
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.aptos import load_aptos_records
from training.preprocessing import RetinalFieldCrop
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


def _load_rgb_image(image_path: Path) -> Image.Image:
    with Image.open(image_path) as image:
        rgb_image = image.convert("RGB")
    setattr(rgb_image, "_retinal_field_crop_cache_key", str(image_path))
    return rgb_image


def main() -> None:
    """Time cache population and one cache hit without augmentation or model work."""

    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    config = AptosConfig(root, root / "train.csv", root / "train_images", "id_code", "diagnosis", 0.15, 42)
    records, failures = load_aptos_records(config, validate_images=False)
    if failures:
        raise RuntimeError("The cache benchmark requires all APTOS training images.")
    partitions = load_aptos_manifest_records(
        PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records
    )
    record = next(item for item in partitions["train"] if item.image_id == "000c1434d8d7")
    crop = RetinalFieldCrop()

    first_image = _load_rgb_image(record.image_path)
    started = time.perf_counter()
    first_result = crop(first_image)
    first_seconds = time.perf_counter() - started
    repeated_image = _load_rgb_image(record.image_path)
    started = time.perf_counter()
    repeated_result = crop(repeated_image)
    repeated_seconds = time.perf_counter() - started
    if first_result.size != repeated_result.size or first_result.tobytes() != repeated_result.tobytes():
        raise AssertionError("Cached crop does not match the uncached crop.")

    print(f"sample: {record.image_id} ({record.image_path.name})")
    print(f"first uncached crop: {first_seconds:.6f} s")
    print(f"repeated cached crop: {repeated_seconds:.6f} s")


if __name__ == "__main__":
    main()
