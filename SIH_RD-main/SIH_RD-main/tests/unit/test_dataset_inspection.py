"""Tests for the read-only dataset-acquisition inspection layer."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from inspect_datasets import inspect_datasets


def _write_config(path: Path, aptos_root: str = "") -> None:
    path.write_text(
        "[datasets.aptos_2019]\n"
        'dataset_name = "APTOS"\n'
        'root_path_env = "TEST_APTOS_ROOT"\n'
        f'root_path = "{aptos_root}"\n'
        "[datasets.idrid]\ndataset_name = \"IDRiD\"\nroot_path = \"\"\n"
        "[datasets.drive]\ndataset_name = \"DRIVE\"\nroot_path = \"\"\n"
        "[datasets.messidor_2]\ndataset_name = \"Messidor-2\"\nroot_path = \"\"\n",
        encoding="utf-8",
    )


class DatasetInspectionTest(unittest.TestCase):
    def test_missing_datasets_are_reported_without_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_root = Path(temporary_directory)
            config_path = temporary_root / "datasets.toml"
            _write_config(config_path)
            reports = inspect_datasets(config_path, project_root=temporary_root)
            self.assertEqual({report.status for report in reports}, {"NOT_FOUND"})

    def test_configured_path_is_respected_and_not_modified(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_root = Path(temporary_directory)
            aptos_root = temporary_root / "configured-aptos"
            aptos_root.mkdir()
            marker = aptos_root / "train.csv"
            marker.write_text("id_code,diagnosis\n", encoding="utf-8")
            before = marker.read_bytes()
            config_path = temporary_root / "datasets.toml"
            _write_config(config_path, aptos_root.as_posix())
            previous_value = os.environ.pop("TEST_APTOS_ROOT", None)
            try:
                report = inspect_datasets(config_path, project_root=temporary_root)[0]
            finally:
                if previous_value is not None:
                    os.environ["TEST_APTOS_ROOT"] = previous_value
            self.assertEqual(report.root, aptos_root)
            self.assertEqual(report.status, "PRESENT")
            self.assertTrue(report.expected_assets["train.csv"])
            self.assertEqual(marker.read_bytes(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
