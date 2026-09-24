"""Measure one canonical 384x384 training batch for E0, E1, and E2 only."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from train_e0_resnet50 import _load_config, _seed_everything, select_device
from training.datasets.aptos import AptosDataset, load_aptos_records
from training.models import build_research_resnet50, build_resnet50_baseline
from training.preprocessing import build_train_transform
from training.utils.aptos_manifest import inverse_frequency_class_weights, load_aptos_manifest_records
from training.utils.config import AptosConfig


def _sync(device: torch.device) -> None:
    if device.type == "mps":
        torch.mps.synchronize()
    elif device.type == "cuda":
        torch.cuda.synchronize(device)


def main() -> None:
    """Run exactly one real batch per existing canonical architecture."""

    config = _load_config()
    _seed_everything(int(config["seed"]))
    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    records, failures = load_aptos_records(
        AptosConfig(root, root / "train.csv", root / "train_images", "id_code", "diagnosis", 0.15, 42),
        validate_images=False,
    )
    if failures:
        raise RuntimeError("Canonical benchmark requires all APTOS images.")
    partitions = load_aptos_manifest_records(
        PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records
    )
    dataset = AptosDataset(partitions["train"], build_train_transform(image_size=384))
    loader = DataLoader(dataset, batch_size=8, shuffle=True, generator=torch.Generator().manual_seed(42), num_workers=0)
    device = select_device()
    print(f"selected device: {device}")
    weights = torch.tensor(inverse_frequency_class_weights(partitions["train"]), device=device)
    for experiment in ("e0", "e1", "e2"):
        started = time.perf_counter(); images, labels = next(iter(loader)); data_seconds = time.perf_counter() - started
        model = (build_resnet50_baseline(pretrained=True) if experiment == "e0" else build_research_resnet50(experiment=experiment, pretrained=True)).to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
        loss_fn = nn.CrossEntropyLoss(weight=weights)
        _sync(device); started = time.perf_counter(); logits = model(images.to(device)); _sync(device); forward_seconds = time.perf_counter() - started
        loss = loss_fn(logits, labels.to(device))
        _sync(device); started = time.perf_counter(); loss.backward(); _sync(device); backward_seconds = time.perf_counter() - started
        _sync(device); started = time.perf_counter(); optimizer.step(); _sync(device); optimizer_seconds = time.perf_counter() - started
        print(f"{experiment}: data={data_seconds:.6f}s forward={forward_seconds:.6f}s backward={backward_seconds:.6f}s optimizer={optimizer_seconds:.6f}s total={data_seconds + forward_seconds + backward_seconds + optimizer_seconds:.6f}s")


if __name__ == "__main__":
    main()
