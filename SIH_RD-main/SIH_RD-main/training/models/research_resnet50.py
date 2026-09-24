"""Shared ResNet-50 E1/E2/E3 research models for DR grading."""

from __future__ import annotations

import torch
import torch.nn.functional as F
from torch import nn
from torchvision.models import ResNet50_Weights, resnet50

from .resnet50_baseline import NUM_DR_CLASSES


LESION_TYPES = ("ma", "he", "ex", "se")


class ResNet50AttentionDR(nn.Module):
    """
    Shared ResNet-50 research model.

    E1:
        ResNet-50 + MHSA + DR grading

    E2:
        E1 + unsupervised evidence representation

    E3:
        E2 + lesion-aware multi-task supervision
        for MA, HE, EX and SE.
    """

    def __init__(
        self,
        *,
        experiment: str,
        pretrained: bool = True,
    ) -> None:
        super().__init__()

        if experiment not in {"e1", "e2", "e3"}:
            raise ValueError(
                "experiment must be 'e1', 'e2' or 'e3'."
            )

        base = resnet50(
            weights=(
                ResNet50_Weights.IMAGENET1K_V2
                if pretrained
                else None
            )
        )

        self.encoder = nn.Sequential(
            *list(base.children())[:-2]
        )

        self.experiment = experiment

        # Shared spatial feature projection for MHSA.
        self.projection = nn.Conv2d(
            2048,
            256,
            kernel_size=1,
        )

        self.attention = nn.MultiheadAttention(
            256,
            num_heads=4,
            batch_first=True,
        )

        self.attention_norm = nn.LayerNorm(256)

        if experiment in {"e2", "e3"}:
            self.evidence_branch = nn.Sequential(
                nn.Conv2d(2048, 256, 1),
                nn.ReLU(inplace=True),
            )

            self.classifier = nn.Linear(
                512,
                NUM_DR_CLASSES,
            )
        else:
            self.evidence_branch = None

            self.classifier = nn.Linear(
                256,
                NUM_DR_CLASSES,
            )

        if experiment == "e3":
            # Shared lesion decoder.
            #
            # The four heads predict independent binary lesion maps.
            # They share the decoder representation but have separate
            # final prediction layers.
            self.lesion_decoder = nn.Sequential(
                nn.Conv2d(
                    2048,
                    256,
                    kernel_size=3,
                    padding=1,
                ),
                nn.BatchNorm2d(256),
                nn.ReLU(inplace=True),
            )

            self.lesion_heads = nn.ModuleDict(
                {
                    lesion: nn.Conv2d(
                        256,
                        1,
                        kernel_size=1,
                    )
                    for lesion in LESION_TYPES
                }
            )
        else:
            self.lesion_decoder = None
            self.lesion_heads = None

    def forward_features(
        self,
        images: torch.Tensor,
    ) -> dict[str, torch.Tensor]:
        """Return shared representations and research branches."""

        backbone_features = self.encoder(images)

        tokens = (
            self.projection(backbone_features)
            .flatten(2)
            .transpose(1, 2)
        )

        attended, attention_weights = self.attention(
            tokens,
            tokens,
            tokens,
            need_weights=True,
        )

        attended = self.attention_norm(
            attended + tokens
        ).mean(dim=1)

        features = {
            "backbone_features": backbone_features,
            "attention_features": attended,
            "attention_weights": attention_weights,
        }

        if self.evidence_branch is not None:
            evidence_map = self.evidence_branch(
                backbone_features
            )

            evidence_features = evidence_map.mean(
                dim=(2, 3)
            )

            features["evidence_map"] = evidence_map

            features["representation"] = torch.cat(
                (
                    attended,
                    evidence_features,
                ),
                dim=1,
            )
        else:
            features["representation"] = attended

        if self.experiment == "e3":
            lesion_features = self.lesion_decoder(
                backbone_features
            )

            features["lesion_features"] = lesion_features

            for lesion in LESION_TYPES:
                # Keep predictions at backbone spatial resolution.
                features[f"{lesion}_logits"] = (
                    self.lesion_heads[lesion](
                        lesion_features
                    )
                )

        return features

    def forward(
        self,
        images: torch.Tensor,
    ) -> torch.Tensor:
        """Backward-compatible DR grading forward pass."""

        features = self.forward_features(images)

        return self.classifier(
            features["representation"]
        )

    def forward_e3(
        self,
        images: torch.Tensor,
        output_size: tuple[int, int] | None = None,
    ) -> dict[str, torch.Tensor]:
        """
        E3 forward pass returning DR logits and lesion logits.

        Lesion outputs are optionally upsampled to the target image
        spatial resolution.
        """

        if self.experiment != "e3":
            raise RuntimeError(
                "forward_e3() requires experiment='e3'."
            )

        features = self.forward_features(images)

        outputs = {
            "dr_logits": self.classifier(
                features["representation"]
            ),
        }

        if output_size is None:
            output_size = (
                images.shape[-2],
                images.shape[-1],
            )

        for lesion in LESION_TYPES:
            logits = features[f"{lesion}_logits"]

            outputs[f"{lesion}_logits"] = F.interpolate(
                logits,
                size=output_size,
                mode="bilinear",
                align_corners=False,
            )

        return outputs


def build_research_resnet50(
    *,
    experiment: str,
    pretrained: bool = True,
) -> ResNet50AttentionDR:
    """Build E1, E2 or E3 using the same ResNet-50 encoder family."""

    return ResNet50AttentionDR(
        experiment=experiment,
        pretrained=pretrained,
    )
