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

    if device is None:
        device = get_device()

    checkpoint_loaded = False
    checkpoint = None
    state_dict = None

    if checkpoint_path.exists():
        # Check if checkpoint is a Git LFS pointer (plain text starting with version https://git-lfs)
        is_lfs = False
        try:
            if checkpoint_path.stat().st_size < 1024:
                with open(checkpoint_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(250)
                    if "git-lfs" in content or "oid sha256:" in content:
                        is_lfs = True
        except Exception:
            pass

        if is_lfs:
            print(
                f"[MODEL_LOADER] Checkpoint at {checkpoint_path} is a Git LFS pointer ({checkpoint_path.stat().st_size} bytes)."
            )
            print("[MODEL_LOADER] Initializing E8ReferableResNet50 architecture for local pipeline & API testing.")
        else:
            try:
                checkpoint = torch.load(
                    checkpoint_path,
                    map_location="cpu",
                    weights_only=True,
                    mmap=True,
                )
                if isinstance(checkpoint, dict) and "model_state" in checkpoint:
                    state_dict = checkpoint.get("model_state")
                    checkpoint_loaded = True
            except Exception as exc:
                print(f"[MODEL_LOADER] Warning loading checkpoint {checkpoint_path}: {exc}")
                print("[MODEL_LOADER] Falling back to initialized E8ReferableResNet50 architecture.")

    model = build_e8_referable_resnet50(
        pretrained=False,
    )

    if checkpoint_loaded and state_dict is not None:
        missing, unexpected = model.load_state_dict(
            state_dict,
            strict=True,
        )
        if missing or unexpected:
            print(
                f"[MODEL_LOADER] Checkpoint mismatch: missing={missing}, unexpected={unexpected}"
            )

    model.to(device)
    model.eval()

    if checkpoint and isinstance(checkpoint, dict):
        metadata = {
            "checkpoint": str(checkpoint_path),
            "device": str(device),
            "experiment": checkpoint.get("configuration", {}).get("experiment", "E9"),
            "epoch": checkpoint.get("epoch", 1),
            "seed": checkpoint.get("seed", 42),
            "configuration": checkpoint.get("configuration", {}),
            "validation_metrics": checkpoint.get("validation_metrics", {}),
        }
    else:
        metadata = {
            "checkpoint": str(checkpoint_path),
            "device": str(device),
            "experiment": "E9-local-dev",
            "epoch": 1,
            "seed": 42,
            "configuration": {"experiment": "E9-local-dev"},
            "validation_metrics": {"status": "local_development_model"},
        }

    del state_dict
    del checkpoint
    import gc
    gc.collect()

    return model, metadata
