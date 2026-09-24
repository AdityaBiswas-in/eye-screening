"""Single-image inference for SIH-26038."""

from __future__ import annotations

from pathlib import Path

import torch
from PIL import Image
from training.preprocessing import build_eval_transform

from app.inference.model_loader import load_model


IMAGE_SIZE = 384

# Frozen E9 deployment calibration parameters.
REFERABLE_THRESHOLD = 0.05
CALIBRATION_TEMPERATURE = 2.069366

DR_LABELS = {
    0: "No DR",
    1: "Mild",
    2: "Moderate",
    3: "Severe",
    4: "Proliferative",
}

LESION_TYPES = ("ma", "he", "ex", "se")

# These names describe experimental evidence heads, not clinical lesion labels.
LESION_LABELS = {
    "ma": "microaneurysm",
    "he": "hemorrhage",
    "ex": "hard_exudate",
    "se": "soft_exudate",
}


def build_inference_transform():
    """Use the same deterministic crop, resize and normalization as E9 evaluation."""

    return build_eval_transform(image_size=IMAGE_SIZE)


def load_image(image_path: str | Path) -> Image.Image:
    """Load an RGB fundus image."""

    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    return Image.open(image_path).convert("RGB")


def predict_image(
    image_path: str | Path,
    model=None,
    device=None,
):
    """Run one fundus image through the E9 model."""

    if model is None:
        model, metadata = load_model(device=device)
        device = torch.device(metadata["device"])
    else:
        metadata = None
        if device is None:
            device = next(model.parameters()).device

    image = load_image(image_path)

    transform = build_inference_transform()
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.inference_mode():
        output = model.forward_e8(
            tensor,
            output_size=(IMAGE_SIZE, IMAGE_SIZE),
        )

    dr_logits = output["dr_logits"]
    referable_logits = output["referable_logits"]

    dr_probabilities = torch.softmax(
        dr_logits / CALIBRATION_TEMPERATURE,
        dim=1,
    )[0]

    dr_grade = int(
        torch.argmax(dr_probabilities).item()
    )

    referable_probability = float(
        torch.sigmoid(referable_logits)[0].item()
    )

    lesion_probabilities = {
        lesion: float(
            torch.sigmoid(output[f"{lesion}_logits"])
            .mean()
            .item()
        )
        for lesion in LESION_TYPES
    }

    return {
        "dr": {
            "grade": dr_grade,
            "label": DR_LABELS[dr_grade],
            "confidence": float(
                dr_probabilities[dr_grade].item()
            ),
            "probabilities": [
                float(value.item())
                for value in dr_probabilities
            ],
        },
        "referable": {
            "probability": referable_probability,
            "prediction": (
                referable_probability
                >= REFERABLE_THRESHOLD
            ),
            "threshold": REFERABLE_THRESHOLD,
            "threshold_source": (
                "E9 pooled validation selection"
            ),
        },
        "lesions": lesion_probabilities,
        "metadata": metadata,
    }
