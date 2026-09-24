"""Measure one synthetic E0 ResNet-50 optimization step without dataset I/O."""

from __future__ import annotations

import platform
import sys
import time
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

import torch
import torchvision
from torch import nn

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from train_e0_resnet50 import _load_config, _seed_everything, select_device
from training.models import build_resnet50_baseline
from training.preprocessing import IMAGE_SIZE


BATCH_SIZE = 8
T = TypeVar("T")


def _synchronize(device: torch.device) -> None:
    """Wait for queued accelerator work so its elapsed time is measurable."""

    if device.type == "mps":
        torch.mps.synchronize()
    elif device.type == "cuda":
        torch.cuda.synchronize(device)


def _time_stage(device: torch.device, operation: Callable[[], T]) -> tuple[T, float]:
    _synchronize(device)
    started = time.perf_counter()
    result = operation()
    _synchronize(device)
    return result, time.perf_counter() - started


def main() -> None:
    """Benchmark model computation only: no APTOS data, preprocessing, or checkpoints."""

    config = _load_config()
    _seed_everything(int(config["seed"]))
    device = select_device()
    print(f"selected device: {device}")
    print(
        f"Python {platform.python_version()} | PyTorch {torch.__version__} | "
        f"torchvision {torchvision.__version__}"
    )

    model, creation_seconds = _time_stage(
        device,
        lambda: build_resnet50_baseline(pretrained=bool(config["pretrained"])).to(device).train(),
    )
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=float(config["learning_rate"]),
        weight_decay=float(config["weight_decay"]),
    )
    criterion = nn.CrossEntropyLoss()
    images = torch.randn(BATCH_SIZE, 3, IMAGE_SIZE, IMAGE_SIZE, device=device)
    labels = torch.arange(BATCH_SIZE, device=device) % 5

    # First pass measures initialization/warm-up effects. The second provides
    # logits for the one and only backward/optimizer step.
    with torch.no_grad():
        first_logits, first_forward_seconds = _time_stage(device, lambda: model(images))
    logits, second_forward_seconds = _time_stage(device, lambda: model(images))
    if tuple(first_logits.shape) != (BATCH_SIZE, 5) or tuple(logits.shape) != (BATCH_SIZE, 5):
        raise AssertionError("Synthetic E0 benchmark produced an unexpected logits shape.")
    loss, loss_seconds = _time_stage(device, lambda: criterion(logits, labels))
    if not torch.isfinite(loss):
        raise AssertionError("Synthetic E0 benchmark loss is not finite.")
    _, backward_seconds = _time_stage(device, loss.backward)
    _, optimizer_seconds = _time_stage(device, optimizer.step)

    print(f"model creation: {creation_seconds:.6f} s")
    print(f"first forward pass: {first_forward_seconds:.6f} s")
    print(f"second forward pass: {second_forward_seconds:.6f} s")
    print(f"loss: {loss_seconds:.6f} s")
    print(f"backward pass: {backward_seconds:.6f} s")
    print(f"optimizer step: {optimizer_seconds:.6f} s")


if __name__ == "__main__":
    main()
