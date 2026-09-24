"""Checkpoint serialization for reproducible baseline experiments."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from torch import nn
from torch.optim import Optimizer


def save_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: Optimizer,
    epoch: int,
    validation_metrics: dict[str, object],
    configuration: dict[str, Any],
    seed: int,
) -> None:
    """Persist model, optimizer, epoch, metrics, configuration, and seed."""

    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {"model_state": model.state_dict(), "optimizer_state": optimizer.state_dict(), "epoch": epoch, "validation_metrics": validation_metrics, "configuration": configuration, "seed": seed},
        path,
    )
