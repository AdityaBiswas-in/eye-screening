"""
Loss functions for E3 lesion-aware multi-task DR training.

Missing lesion annotations are ignored, never treated as negative lesions.
"""

from __future__ import annotations

import torch
import torch.nn.functional as F


LESION_TYPES = ("ma", "he", "ex", "se")


def compute_e3_loss(
    *,
    dr_logits: torch.Tensor,
    grades: torch.Tensor,
    lesion_logits: dict[str, torch.Tensor],
    lesion_masks: dict[str, torch.Tensor],
    lesion_available: dict[str, torch.Tensor],
    dr_criterion,
    lesion_weight: float = 1.0,
):
    dr_loss = dr_criterion(
        dr_logits,
        grades,
    )

    lesion_losses = {}
    active_losses = []

    for lesion in LESION_TYPES:
        logits = lesion_logits[lesion]
        targets = lesion_masks[lesion]
        available = lesion_available[lesion].to(
            device=logits.device,
            dtype=torch.bool,
        )

        sample_losses = []

        for index in range(logits.shape[0]):
            if bool(available[index]):
                sample_losses.append(
                    F.binary_cross_entropy_with_logits(
                        logits[index:index + 1],
                        targets[index:index + 1],
                    )
                )

        if sample_losses:
            lesion_loss = torch.stack(sample_losses).mean()
            active_losses.append(lesion_loss)
        else:
            lesion_loss = logits.sum() * 0.0

        lesion_losses[lesion] = lesion_loss

    if active_losses:
        lesion_loss = torch.stack(active_losses).mean()
    else:
        lesion_loss = dr_logits.sum() * 0.0

    total_loss = dr_loss + lesion_weight * lesion_loss

    loss_values = {
        "total": float(total_loss.detach().cpu()),
        "dr": float(dr_loss.detach().cpu()),
        "lesion": float(lesion_loss.detach().cpu()),
    }

    for lesion in LESION_TYPES:
        loss_values[lesion] = float(
            lesion_losses[lesion].detach().cpu()
        )

    return total_loss, loss_values
