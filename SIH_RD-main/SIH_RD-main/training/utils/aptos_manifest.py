"""Read and validate the locked APTOS split manifest without regenerating it."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

from training.datasets.aptos import AptosRecord


MANIFEST_COLUMNS = ["id_code", "diagnosis", "split"]
VALID_SPLITS = {"train", "validation", "test"}


def load_aptos_manifest_records(
    manifest_path: Path, records: list[AptosRecord]
) -> dict[str, list[AptosRecord]]:
    """Map validated source records into their manifest-defined partitions."""

    by_id = {record.image_id: record for record in records}
    with manifest_path.open(newline="", encoding="utf-8") as manifest_file:
        reader = csv.DictReader(manifest_file)
        if reader.fieldnames != MANIFEST_COLUMNS:
            raise ValueError("APTOS split manifest must contain id_code, diagnosis, split columns.")
        rows = list(reader)
    identifiers = [row.get("id_code", "") for row in rows]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError("APTOS split manifest contains duplicate id_code values.")
    if set(identifiers) != set(by_id):
        raise ValueError("APTOS split manifest IDs do not match validated source records.")
    partitions = {split: [] for split in VALID_SPLITS}
    for row in rows:
        image_id = row["id_code"]
        record = by_id[image_id]
        if row["split"] not in VALID_SPLITS:
            raise ValueError(f"Invalid manifest split for {image_id!r}.")
        if int(row["diagnosis"]) != record.label:
            raise ValueError(f"Manifest diagnosis differs from source label for {image_id!r}.")
        partitions[row["split"]].append(record)
    return partitions


def inverse_frequency_class_weights(records: list[AptosRecord]) -> list[float]:
    """Return inverse-frequency class weights from training records only."""

    counts = Counter(record.label for record in records)
    if set(counts) != set(range(5)):
        raise ValueError("Training records must include every DR class for weighted E0 loss.")
    total = len(records)
    return [total / (5 * counts[grade]) for grade in range(5)]
