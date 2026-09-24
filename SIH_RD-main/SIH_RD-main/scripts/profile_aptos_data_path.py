"""Profile the existing training data path for one locked APTOS training sample."""

from __future__ import annotations

import sys
import time
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from PIL import Image
from torchvision import transforms as torchvision_transforms

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.aptos import load_aptos_records
from training.preprocessing import build_train_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig


T = TypeVar("T")


def _time_stage(operation: Callable[[], T]) -> tuple[T, float]:
    started = time.perf_counter()
    result = operation()
    return result, time.perf_counter() - started


def main() -> None:
    """Time one sample without iterating a DataLoader or changing its transform."""

    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    data_config = AptosConfig(root, root / "train.csv", root / "train_images", "id_code", "diagnosis", 0.15, 42)
    records, failures = load_aptos_records(data_config, validate_images=False)
    if failures:
        raise RuntimeError("The data-path diagnostic requires all APTOS training images.")
    partitions = load_aptos_manifest_records(
        PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records
    )
    record = partitions["train"][0]
    train_transform = build_train_transform()
    preprocessing = train_transform.transforms[0].transforms
    ensure_rgb, retinal_crop, resize = preprocessing
    augmentation = torchvision_transforms.Compose(train_transform.transforms[1:4])
    tensor_and_normalize = torchvision_transforms.Compose(train_transform.transforms[4:])

    image_open_started = time.perf_counter()
    with Image.open(record.image_path) as source:
        source.load()
        image_read_seconds = time.perf_counter() - image_open_started
        rgb_image, rgb_conversion_seconds = _time_stage(lambda: source.convert("RGB"))

    transform_started = time.perf_counter()
    prepared_image, ensure_rgb_seconds = _time_stage(lambda: ensure_rgb(rgb_image))
    cropped_image, crop_seconds = _time_stage(lambda: retinal_crop(prepared_image))
    resized_image, resize_seconds = _time_stage(lambda: resize(cropped_image))
    augmented_image, augmentation_seconds = _time_stage(lambda: augmentation(resized_image))
    _, tensor_normalization_seconds = _time_stage(lambda: tensor_and_normalize(augmented_image))
    total_transform_seconds = time.perf_counter() - transform_started

    print(f"sample: {record.image_id} ({record.image_path.name})")
    print(f"image file open/read: {image_read_seconds:.6f} s")
    print(f"PIL to RGB conversion: {rgb_conversion_seconds:.6f} s")
    print(f"preprocessing RGB copy: {ensure_rgb_seconds:.6f} s")
    print(f"retinal foreground/crop: {crop_seconds:.6f} s")
    print(f"resize: {resize_seconds:.6f} s")
    print(f"augmentation: {augmentation_seconds:.6f} s")
    print(f"tensor conversion/normalization: {tensor_normalization_seconds:.6f} s")
    print(f"total transform: {total_transform_seconds:.6f} s")


if __name__ == "__main__":
    main()
