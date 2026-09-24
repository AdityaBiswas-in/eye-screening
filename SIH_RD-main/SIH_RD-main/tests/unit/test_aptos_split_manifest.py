"""Unit tests for APTOS split-manifest generation and validation."""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from generate_aptos_splits import (
    AptosTrainingRow,
    generate_manifest,
    validate_manifest,
)


class AptosSplitManifestTest(unittest.TestCase):
    def _create_fixture(self, root: Path) -> list[AptosTrainingRow]:
        images_dir = root / "train_images"
        images_dir.mkdir(parents=True)
        rows: list[AptosTrainingRow] = []
        for diagnosis in range(5):
            for sample in range(20):
                image_id = f"grade_{diagnosis}_{sample}"
                Image.new("RGB", (8, 8), color=(diagnosis * 20, 0, 0)).save(
                    images_dir / f"{image_id}.png"
                )
                rows.append(AptosTrainingRow(image_id, diagnosis))
        with (root / "train.csv").open("w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=["id_code", "diagnosis"])
            writer.writeheader()
            writer.writerows(
                {"id_code": row.id_code, "diagnosis": row.diagnosis} for row in rows
            )
        return rows

    def test_manifest_is_reproducible_complete_and_stratified(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory) / "aptos2019"
            self._create_fixture(root)
            first_manifest = root.parent / "first.csv"
            second_manifest = root.parent / "second.csv"
            self.assertEqual(generate_manifest(root, first_manifest, seed=42), Counter(train=70, validation=15, test=15))
            generate_manifest(root, second_manifest, seed=42)
            self.assertEqual(first_manifest.read_bytes(), second_manifest.read_bytes())

            with first_manifest.open(newline="", encoding="utf-8") as manifest_file:
                manifest_rows = list(csv.DictReader(manifest_file))
            self.assertEqual(len(manifest_rows), 100)
            self.assertEqual(len({row["id_code"] for row in manifest_rows}), 100)
            for split, expected_per_class in (("train", 14), ("validation", 3), ("test", 3)):
                counts = Counter(
                    int(row["diagnosis"])
                    for row in manifest_rows
                    if row["split"] == split
                )
                self.assertEqual(counts, Counter({grade: expected_per_class for grade in range(5)}))

    def test_manifest_validation_rejects_duplicate_ids(self) -> None:
        rows = [AptosTrainingRow("first", 0), AptosTrainingRow("second", 1)]
        with tempfile.TemporaryDirectory() as temporary_directory:
            manifest_path = Path(temporary_directory) / "manifest.csv"
            manifest_path.write_text(
                "id_code,diagnosis,split\nfirst,0,train\nfirst,0,test\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "duplicate id_code"):
                validate_manifest(manifest_path, rows)


if __name__ == "__main__":
    unittest.main(verbosity=2)
