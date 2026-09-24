"""Offline smoke test for the APTOS Dataset and DataLoader."""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path

import torch
from PIL import Image
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets import AptosDataset, load_aptos_records, make_stratified_split
from training.preprocessing import IMAGE_SIZE, build_train_transform
from training.utils.config import load_aptos_config


class AptosDatasetSmokeTest(unittest.TestCase):
    def test_dataset_and_dataloader(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            images_dir = root / "train_images"
            images_dir.mkdir()
            labels_path = root / "train.csv"
            rows: list[tuple[str, int]] = []
            for grade in range(5):
                for sample in range(5):
                    image_id = f"grade_{grade}_{sample}"
                    Image.new("RGB", (512, 400), color=(grade * 30, 80, 120)).save(
                        images_dir / f"{image_id}.png"
                    )
                    rows.append((image_id, grade))
            with labels_path.open("w", newline="", encoding="utf-8") as labels_file:
                writer = csv.writer(labels_file)
                writer.writerow(["id_code", "diagnosis"])
                writer.writerows(rows)

            config_path = root / "aptos.toml"
            config_path.write_text(
                "[aptos]\n"
                f'dataset_root = "{root.as_posix()}"\n'
                'labels_file = "train.csv"\nimages_dir = "train_images"\n'
                "validation_fraction = 0.2\nseed = 17\n",
                encoding="utf-8",
            )
            records, failures = load_aptos_records(load_aptos_config(config_path))
            self.assertEqual(failures, [])
            labels = [record.label for record in records]
            split = make_stratified_split(records, labels, 0.2, seed=17)
            self.assertEqual(split, make_stratified_split(records, labels, 0.2, seed=17))

            dataset = AptosDataset(
                [records[index] for index in split.train_indices], build_train_transform()
            )
            image, label = dataset[0]
            self.assertEqual(tuple(image.shape), (3, IMAGE_SIZE, IMAGE_SIZE))
            self.assertTrue(torch.isfinite(image).all().item())
            self.assertIn(label, range(5))

            batch_images, batch_labels = next(iter(DataLoader(dataset, batch_size=4, shuffle=False)))
            self.assertEqual(tuple(batch_images.shape), (4, 3, IMAGE_SIZE, IMAGE_SIZE))
            self.assertTrue(torch.isfinite(batch_images).all().item())
            self.assertTrue(torch.all((batch_labels >= 0) & (batch_labels <= 4)).item())


if __name__ == "__main__":
    unittest.main(verbosity=2)
