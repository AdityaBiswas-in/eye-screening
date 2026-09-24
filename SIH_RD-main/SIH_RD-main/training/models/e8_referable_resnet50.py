"""E8: E4 research model + direct referable-DR prediction head."""

from __future__ import annotations

import torch
from torch import nn

from .research_resnet50 import (
    LESION_TYPES,
    ResNet50AttentionDR,
)


class E8ReferableResNet50(ResNet50AttentionDR):
    """
    E4-compatible model with an additional direct referable-DR head.

    The inherited E3 architecture is preserved exactly:
        ResNet-50
        + MHSA
        + evidence branch
        + lesion decoder
        + four lesion heads
        + 5-class DR classifier

    E8 adds:
        representation -> binary referable DR classifier

    Referable target:
        grades 0,1 -> 0
        grades 2,3,4 -> 1

    This threshold definition is a protocol assumption and is not
    itself a claim of universal clinical validity.
    """

    def __init__(
        self,
        *,
        pretrained: bool = True,
    ) -> None:
        super().__init__(
            experiment="e3",
            pretrained=pretrained,
        )

        # E3/E4 representation:
        # MHSA features = 256
        # evidence features = 256
        # total = 512
        self.referable_classifier = nn.Linear(
            512,
            1,
        )

    def forward_e8(
        self,
        images: torch.Tensor,
        output_size: tuple[int, int] | None = None,
    ) -> dict[str, torch.Tensor]:
        """
        Forward pass returning all E8 outputs.
        """

        features = self.forward_features(images)

        representation = features["representation"]

        outputs = {
            "dr_logits": self.classifier(
                representation
            ),
            "referable_logits": (
                self.referable_classifier(
                    representation
                ).squeeze(1)
            ),
        }

        if output_size is None:
            output_size = (
                images.shape[-2],
                images.shape[-1],
            )

        for lesion in LESION_TYPES:
            logits = features[f"{lesion}_logits"]

            outputs[f"{lesion}_logits"] = (
                torch.nn.functional.interpolate(
                    logits,
                    size=output_size,
                    mode="bilinear",
                    align_corners=False,
                )
            )

        outputs["representation"] = representation
        outputs["attention_weights"] = (
            features["attention_weights"]
        )

        if "evidence_map" in features:
            outputs["evidence_map"] = (
                features["evidence_map"]
            )

        return outputs


def build_e8_referable_resnet50(
    *,
    pretrained: bool = True,
) -> E8ReferableResNet50:
    """Build the E8 referable-aware research model."""

    return E8ReferableResNet50(
        pretrained=pretrained,
    )
