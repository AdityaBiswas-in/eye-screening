"""Five-class ResNet-50 baseline for E0 DR grading."""

from __future__ import annotations

from torch import nn
from torchvision.models import ResNet50_Weights, resnet50


NUM_DR_CLASSES = 5


def build_resnet50_baseline(*, pretrained: bool = True) -> nn.Module:
    """Build ResNet-50 with a five-logit DR grading classifier head.

    ``pretrained=True`` requests torchvision ImageNet weights, which torchvision
    may need to retrieve if they are not available locally. Tests use
    ``pretrained=False`` and the training script does not run automatically.
    """

    weights = ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
    model = resnet50(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, NUM_DR_CLASSES)
    return model
