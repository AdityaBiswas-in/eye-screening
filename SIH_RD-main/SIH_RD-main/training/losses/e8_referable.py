"""E8 joint DR grading + referable DR + lesion supervision."""

from __future__ import annotations

import torch
import torch.nn.functional as F

from .e3_multitask import LESION_TYPES, compute_e3_loss


def compute_e8_loss(
    *,
    dr_logits,
    referable_logits,
    grades,
    lesion_logits,
    lesion_masks,
    lesion_available,
    dr_criterion,
    referable_criterion,
    lesion_weight=1.0,
    referable_weight=1.0,
):
    referable_targets = (grades >= 2).float()

    dr_loss = dr_criterion(
        dr_logits,
        grades,
    )

    referable_loss = referable_criterion(
        referable_logits,
        referable_targets,
    )

    # Reuse the verified E3 lesion loss.
    lesion_total, lesion_values = compute_e3_loss(
        dr_logits=dr_logits,
        grades=grades,
        lesion_logits=lesion_logits,
        lesion_masks=lesion_masks,
        lesion_available=lesion_available,
        dr_criterion=dr_criterion,
        lesion_weight=lesion_weight,
    )

    # lesion_total already contains DR loss + lesion loss.
    total_loss = (
        lesion_total
        + referable_weight * referable_loss
    )

    values = {
        "total": float(total_loss.detach().cpu()),
        "dr": float(dr_loss.detach().cpu()),
        "referable": float(
            referable_loss.detach().cpu()
        ),
        "lesion": float(
            lesion_values["lesion"]
        ),
    }

    for lesion in LESION_TYPES:
        values[lesion] = lesion_values[lesion]

    return total_loss, values
