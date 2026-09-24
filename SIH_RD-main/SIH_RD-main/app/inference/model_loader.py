"""Model loading utilities for SIH-26038 inference."""

from __future__ import annotations

import os
from pathlib import Path

import torch

from training.models import build_e8_referable_resnet50


DEFAULT_CHECKPOINT = (
    Path(__file__).resolve().parents[2]
    / "checkpoints"
    / "e9_full_referable_best.pt"
)


def resolve_checkpoint_path(
    checkpoint_path: str | Path | None = None,
) -> Path:
    """Resolve an explicit path, then ``MODEL_PATH``, then the project default."""

    if checkpoint_path is not None:
        return Path(checkpoint_path)

    configured_path = os.environ.get("MODEL_PATH")
    if configured_path:
        return Path(configured_path)

    return DEFAULT_CHECKPOINT


def get_device() -> torch.device:
    """Select the safest available inference device."""

    configured_device = os.environ.get("INFERENCE_DEVICE")
    if configured_device:
        return torch.device(configured_device)

    if torch.backends.mps.is_available():
        return torch.device("mps")

    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


def load_model(
    checkpoint_path: str | Path | None = None,
    *,
    device: torch.device | None = None,
):
    """
    Load an E8-compatible E9 checkpoint.

    The deployed model architecture is:

        ResNet-50
        + MHSA
        + evidence branch
        + lesion heads
        + direct referable-DR head.

    The checkpoint path remains configurable because final model
    selection is performed only after E9 evaluation.
    """

    checkpoint_path = resolve_checkpoint_path(checkpoint_path)

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {checkpoint_path}"
        )

    if device is None:
        device = get_device()

    checkpoint = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=True,
        mmap=True,
    )

    if not isinstance(checkpoint, dict):
        raise TypeError(
            "Expected checkpoint to be a dictionary."
        )

    state_dict = checkpoint.get("model_state")

    if state_dict is None:
        raise KeyError(
            "Checkpoint does not contain 'model_state'."
        )

    model = build_e8_referable_resnet50(
        pretrained=False,
    )

    missing, unexpected = model.load_state_dict(
        state_dict,
        strict=True,
    )

    if missing or unexpected:
        raise RuntimeError(
            "Checkpoint/model mismatch: "
            f"missing={missing}, unexpected={unexpected}"
        )

    model.to(device)
    model.eval()

    metadata = {
        "checkpoint": str(checkpoint_path),
        "device": str(device),
        "experiment": checkpoint.get(
            "configuration",
            {},
        ).get("experiment"),
        "epoch": checkpoint.get("epoch"),
        "seed": checkpoint.get("seed"),
        "configuration": checkpoint.get(
            "configuration",
            {},
        ),
        "validation_metrics": checkpoint.get(
            "validation_metrics",
            {},
        ),
    }

    del state_dict
    del checkpoint
    import gc
    gc.collect()

    return model, metadata
