"""Tests for E0 baseline infrastructure without pretrained-weight downloads."""

from __future__ import annotations

import csv
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import torch

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from training.datasets.aptos import AptosRecord
from training.evaluation.metrics import compute_dr_metrics
from training.models import build_resnet50_baseline, build_research_resnet50
from training.models import build_e3_lesion_aware_resnet50
from training.losses import masked_dice_bce_loss
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.checkpoints import save_checkpoint
from train_e0_resnet50 import _load_config, select_device


class E0BaselineTest(unittest.TestCase):
    def test_device_selection_preference_order(self) -> None:
        self.assertEqual(select_device(cuda_available=True, mps_available=True).type, "cuda")
        self.assertEqual(select_device(cuda_available=False, mps_available=True).type, "mps")
        self.assertEqual(select_device(cuda_available=False, mps_available=False).type, "cpu")

    def test_canonical_and_development_e0_profiles(self) -> None:
        canonical = _load_config()
        development = _load_config(development=True)
        self.assertEqual(canonical["image_size"], 384)
        self.assertEqual(canonical["batch_size"], 8)
        self.assertEqual(canonical["epochs"], 10)
        self.assertEqual(development["image_size"], 224)
        self.assertEqual(development["batch_size"], 8)
        self.assertEqual(development["epochs"], 1)
        self.assertEqual(canonical["model"], development["model"])
        self.assertTrue(canonical["pretrained"])
        self.assertTrue(development["pretrained"])

    def test_model_output_shape(self) -> None:
        model = build_resnet50_baseline(pretrained=False).eval()
        with torch.no_grad():
            self.assertEqual(tuple(model(torch.zeros(1, 3, 64, 64)).shape), (1, 5))

    def test_e1_e2_forward_and_backward(self) -> None:
        for experiment in ("e1", "e2"):
            model = build_research_resnet50(experiment=experiment, pretrained=False)
            logits = model(torch.zeros(1, 3, 64, 64))
            self.assertEqual(tuple(logits.shape), (1, 5))
            logits.sum().backward()
            self.assertTrue(any(parameter.grad is not None for parameter in model.parameters()))

    def test_e3_outputs_and_partial_lesion_loss(self) -> None:
        model = build_e3_lesion_aware_resnet50(pretrained=False)
        outputs = model(torch.zeros(2, 3, 64, 64))
        self.assertEqual(tuple(outputs["dr_logits"].shape), (2, 5))
        self.assertEqual(outputs["lesion_logits"].shape[1], 4)
        self.assertEqual(outputs["lesion_logits"].shape, outputs["lesion_probability_map"].shape)
        unavailable = torch.tensor([False, False])
        self.assertIsNone(masked_dice_bce_loss(outputs["lesion_logits"], None, unavailable))
        targets = torch.zeros_like(outputs["lesion_logits"])
        available = torch.tensor([True, False])
        loss = masked_dice_bce_loss(outputs["lesion_logits"], targets, available)
        self.assertIsNotNone(loss)
        assert loss is not None
        loss.backward()
        self.assertIsNotNone(model.lesion_classifier.weight.grad)

    def test_manifest_loading_and_label_ranges(self) -> None:
        records = [AptosRecord(f"id_{i}", Path(f"/tmp/id_{i}.png"), i) for i in range(5)]
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "manifest.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["id_code", "diagnosis", "split"])
                writer.writeheader()
                for record in records:
                    writer.writerow({"id_code": record.image_id, "diagnosis": record.label, "split": "train"})
            loaded = load_aptos_manifest_records(path, records)
            self.assertEqual(len(loaded["train"]), 5)
            self.assertEqual([record.label for record in loaded["train"]], list(range(5)))

    def test_metrics_and_checkpoint_metadata(self) -> None:
        probabilities = np.eye(5, dtype=float)
        metrics = compute_dr_metrics([0, 1, 2, 3, 4], probabilities)
        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(metrics["referable_dr"]["sensitivity"], 1.0)
        model = torch.nn.Linear(2, 5)
        optimizer = torch.optim.AdamW(model.parameters())
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "checkpoint.pt"
            save_checkpoint(path, model, optimizer, 3, metrics, {"model": "E0"}, 42)
            checkpoint = torch.load(path, weights_only=False)
            self.assertEqual(set(checkpoint), {"model_state", "optimizer_state", "epoch", "validation_metrics", "configuration", "seed"})
            self.assertEqual(checkpoint["epoch"], 3)
            self.assertEqual(checkpoint["seed"], 42)
