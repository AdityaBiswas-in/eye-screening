"""Report APTOS dataset and split statistics without training a model."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets import load_aptos_records, make_stratified_split  # noqa: E402
from training.utils.config import load_aptos_config  # noqa: E402


def _distribution(labels: list[int]) -> dict[str, int]:
    counts = Counter(labels)
    return {str(grade): counts.get(grade, 0) for grade in range(5)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, help="Path to an APTOS TOML configuration.")
    arguments = parser.parse_args()

    config = load_aptos_config(arguments.config)
    records, failures = load_aptos_records(config, validate_images=True)
    labels = [record.label for record in records]
    split = make_stratified_split(records, labels, config.validation_fraction, config.seed)
    train_labels = [labels[index] for index in split.train_indices]
    validation_labels = [labels[index] for index in split.validation_indices]

    report = {
        "total_valid_images": len(records),
        "class_distribution": _distribution(labels),
        "train_size": len(split.train_indices),
        "validation_size": len(split.validation_indices),
        "train_class_distribution": _distribution(train_labels),
        "validation_class_distribution": _distribution(validation_labels),
        "image_loading_failures": [
            {"image_id": item.image_id, "path": str(item.image_path), "reason": item.reason}
            for item in failures
        ],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
