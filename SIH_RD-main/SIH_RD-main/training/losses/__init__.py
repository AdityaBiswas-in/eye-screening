"""Loss functions for explicitly configured research experiments."""

from .lesion import masked_dice_bce_loss

__all__ = ["masked_dice_bce_loss"]
