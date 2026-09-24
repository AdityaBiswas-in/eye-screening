"""Partial-supervision lesion segmentation loss using PyTorch only."""

from __future__ import annotations

import torch
from torch.nn import functional as functional


def masked_dice_bce_loss(
    logits: torch.Tensor, targets: torch.Tensor | None, supervision_available: torch.Tensor
) -> torch.Tensor | None:
    """Return Dice+BCE loss only for samples with verified masks, else ``None``.

    Missing annotations are excluded rather than interpreted as lesion-negative.
    Target masks are expected to have four MA/HE/EX/SE channels.
    """

    if targets is None or not bool(supervision_available.any()):
        return None
    if logits.ndim != 4 or targets.ndim != 4 or targets.shape[1] != 4:
        raise ValueError("Lesion logits and targets must be [batch, 4, height, width].")
    selected_logits = logits[supervision_available]
    selected_targets = targets[supervision_available].to(dtype=logits.dtype)
    if selected_targets.shape[-2:] != selected_logits.shape[-2:]:
        selected_targets = functional.interpolate(selected_targets, size=selected_logits.shape[-2:], mode="nearest")
    bce = functional.binary_cross_entropy_with_logits(selected_logits, selected_targets)
    probabilities = torch.sigmoid(selected_logits)
    intersection = (probabilities * selected_targets).sum(dim=(0, 2, 3))
    denominator = probabilities.sum(dim=(0, 2, 3)) + selected_targets.sum(dim=(0, 2, 3))
    dice_loss = 1 - ((2 * intersection + 1e-6) / (denominator + 1e-6)).mean()
    return bce + dice_loss
