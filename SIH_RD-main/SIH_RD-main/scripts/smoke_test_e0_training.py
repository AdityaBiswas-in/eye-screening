"""Run exactly one E0 training step without checkpoints or pretrained-weight downloads."""

from __future__ import annotations

import sys
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from train_e0_resnet50 import _load_config, _seed_everything, select_device
from training.datasets.aptos import AptosDataset, load_aptos_records
from training.models import build_resnet50_baseline
from training.preprocessing import IMAGE_SIZE, build_train_transform
from training.utils.aptos_manifest import (
    inverse_frequency_class_weights,
    load_aptos_manifest_records,
)
from training.utils.config import AptosConfig


SMOKE_BATCH_SIZE = 1


def main() -> None:
    """Load one locked training batch and complete one optimization step."""

    config = _load_config()
    _seed_everything(int(config["seed"]))
    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    data_config = AptosConfig(
        root, root / "train.csv", root / "train_images", "id_code", "diagnosis", 0.15,
        int(config["seed"]),
    )
    records, failures = load_aptos_records(data_config, validate_images=False)
    if failures:
        raise RuntimeError("E0 smoke test requires all manifest images to be present.")
    partitions = load_aptos_manifest_records(
        PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records
    )
    train_dataset = AptosDataset(partitions["train"], build_train_transform())
    images, labels = next(iter(DataLoader(train_dataset, batch_size=SMOKE_BATCH_SIZE, shuffle=False)))

    device = select_device()
    print(f"selected device: {device}")
    # Explicitly avoid a possible torchvision ImageNet-weight download for this smoke test.
    model = build_resnet50_baseline(pretrained=False).to(device).train()
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=float(config["learning_rate"]),
        weight_decay=float(config["weight_decay"]),
    )
    criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(inverse_frequency_class_weights(partitions["train"]), device=device)
    )

    expected_input_shape = (SMOKE_BATCH_SIZE, 3, IMAGE_SIZE, IMAGE_SIZE)
    if tuple(images.shape) != expected_input_shape:
        raise AssertionError(f"Unexpected input shape: {tuple(images.shape)}")
    optimizer.zero_grad(set_to_none=True)
    logits = model(images.to(device))
    expected_output_shape = (SMOKE_BATCH_SIZE, 5)
    if tuple(logits.shape) != expected_output_shape:
        raise AssertionError(f"Unexpected output shape: {tuple(logits.shape)}")
    loss = criterion(logits, labels.to(device))
    if not torch.isfinite(loss):
        raise AssertionError("Training loss is not finite.")
    loss.backward()
    if not any(parameter.grad is not None for parameter in model.parameters()):
        raise AssertionError("No model gradients were produced.")
    optimizer.step()
    print(
        "E0 one-step training smoke test passed: "
        f"input={tuple(images.shape)}, logits={tuple(logits.shape)}, loss={loss.item():.6f}"
    )


if __name__ == "__main__":
    main()
