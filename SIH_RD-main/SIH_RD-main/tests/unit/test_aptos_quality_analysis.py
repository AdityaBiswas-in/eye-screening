"""Unit tests for deterministic APTOS exploratory-quality feature tables."""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from analyze_aptos_quality import (
    FEATURE_TABLE_COLUMNS,
    build_feature_rows,
    validate_feature_rows,
    write_feature_table,
)
from training.datasets.aptos import AptosRecord


class AptosQualityAnalysisTest(unittest.TestCase):
    def _records(self, root: Path) -> list[AptosRecord]:
        records: list[AptosRecord] = []
        for image_id, label, color in (("zeta", 0, 30), ("alpha", 1, 90)):
            image_path = root / f"{image_id}.png"
            Image.new("RGB", (12, 8), color=(color, color, color)).save(image_path)
            records.append(AptosRecord(image_id=image_id, image_path=image_path, label=label))
        return records

    def test_table_has_deterministic_order_schema_and_finite_values(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            records = self._records(Path(temporary_directory))
            first = build_feature_rows(records, limit=2)
            second = build_feature_rows(records, limit=2)
            self.assertEqual(first, second)
            self.assertEqual([row["image_id"] for row in first], ["alpha", "zeta"])
            self.assertEqual(tuple(first[0]), FEATURE_TABLE_COLUMNS)
            output = Path(temporary_directory) / "features.csv"
            write_feature_table(first, output)
            with output.open(newline="", encoding="utf-8") as csv_file:
                self.assertEqual(tuple(csv.DictReader(csv_file).fieldnames or ()), FEATURE_TABLE_COLUMNS)

    def test_validation_rejects_duplicate_ids(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            rows = build_feature_rows(self._records(Path(temporary_directory)), limit=2)
            duplicate_rows = [rows[0], {**rows[0], "label": 1}]
            with self.assertRaisesRegex(ValueError, "duplicate image_id"):
                validate_feature_rows(duplicate_rows, expected_count=2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
