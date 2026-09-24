"""E3 lesion-aware, shared-encoder research model with partial supervision support."""

from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as functional
from torchvision.models import ResNet50_Weights, resnet50

from .resnet50_baseline import NUM_DR_CLASSES


LESION_CLASSES = ("MA", "HE", "EX", "SE")


class E3LesionAwareResNet50(nn.Module):
    """Shared ResNet-50, MHSA grading, and a lightweight four-channel lesion head.

    The lesion head is a prediction head, but is only trained where a verified
    annotation is supplied. It is not clinically validated.
    """

    def __init__(self, *, pretrained: bool = True) -> None:
        super().__init__()
        base = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2 if pretrained else None)
        self.encoder = nn.Sequential(*list(base.children())[:-2])
        self.projection = nn.Conv2d(2048, 256, 1)
        self.attention = nn.MultiheadAttention(256, num_heads=4, batch_first=True)
        self.attention_norm = nn.LayerNorm(256)
        self.lesion_feature_head = nn.Sequential(nn.Conv2d(2048, 128, 1), nn.ReLU(inplace=True))
        self.lesion_classifier = nn.Conv2d(128, len(LESION_CLASSES), 1)
        self.cross_task_fusion = nn.Sequential(nn.Linear(384, 384), nn.ReLU(inplace=True))
        self.dr_classifier = nn.Linear(384, NUM_DR_CLASSES)

    def forward(self, images: torch.Tensor) -> dict[str, torch.Tensor]:
        """Return DR logits and intermediate tensors needed for lesion/XAI research."""

        backbone_features = self.encoder(images)
        tokens = self.projection(backbone_features).flatten(2).transpose(1, 2)
        attended_tokens, attention_weights = self.attention(tokens, tokens, tokens, need_weights=True)
        dr_attention_features = self.attention_norm(attended_tokens + tokens).mean(dim=1)
        lesion_feature_map = self.lesion_feature_head(backbone_features)
        lesion_logits = self.lesion_classifier(lesion_feature_map)
        lesion_probability_map = torch.sigmoid(lesion_logits)
        lesion_features = lesion_feature_map.mean(dim=(2, 3))
        representation = self.cross_task_fusion(torch.cat((dr_attention_features, lesion_features), dim=1))
        return {
            "dr_logits": self.dr_classifier(representation),
            "lesion_logits": lesion_logits,
            "lesion_probability_map": lesion_probability_map,
            "lesion_feature_map": lesion_feature_map,
            "attention_weights": attention_weights,
            "representation": representation,
        }


def build_e3_lesion_aware_resnet50(*, pretrained: bool = True) -> E3LesionAwareResNet50:
    """Build the E3 experimental model using the same ImageNet-pretrained ResNet-50."""

    return E3LesionAwareResNet50(pretrained=pretrained)
