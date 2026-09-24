"""Grad-CAM for SIH-26038 E9 DR classification."""

from __future__ import annotations

import torch
import torch.nn.functional as F


TARGET_LAYER_NAME = "encoder.7"


class GradCAM:
    """
    Grad-CAM for the E9 DR classification head.

    The target layer is the final convolutional ResNet block:
        model.encoder.7
    """

    def __init__(self, model):
        self.model = model
        self.activations = None
        self.gradients = None

        self.target_layer = model.encoder[7]

        self.forward_handle = self.target_layer.register_forward_hook(
            self._save_activation
        )

        self.backward_handle = self.target_layer.register_full_backward_hook(
            self._save_gradient
        )

    def _save_activation(self, module, inputs, output):
        self.activations = output

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def remove_hooks(self):
        self.forward_handle.remove()
        self.backward_handle.remove()

    def generate(
        self,
        image_tensor: torch.Tensor,
        target_class: int | None = None,
    ):
        """
        Generate a Grad-CAM heatmap for a DR class.

        Returns:
            heatmap: [1, 1, H, W]
            predicted_class: integer
            probabilities: [1, 5]
        """

        try:
            self.model.zero_grad(set_to_none=True)

            output = self.model.forward_e8(
                image_tensor,
                output_size=(384, 384),
            )

            dr_logits = output["dr_logits"]

            probabilities = torch.softmax(
                dr_logits,
                dim=1,
            )

            predicted_class = int(
                torch.argmax(probabilities, dim=1)[0].item()
            )

            if target_class is None:
                target_class = predicted_class

            target_score = dr_logits[
                0,
                target_class,
            ]

            target_score.backward()

            if self.activations is None:
                raise RuntimeError(
                    "Grad-CAM activation was not captured."
                )

            if self.gradients is None:
                raise RuntimeError(
                    "Grad-CAM gradients were not captured."
                )

            activations = self.activations
            gradients = self.gradients

            # Global-average-pool gradients over spatial dimensions.
            weights = gradients.mean(
                dim=(2, 3),
                keepdim=True,
            )

            cam = (
                weights * activations
            ).sum(dim=1, keepdim=True)

            cam = F.relu(cam)

            cam = F.interpolate(
                cam,
                size=image_tensor.shape[-2:],
                mode="bilinear",
                align_corners=False,
            )

            # Normalize each image independently to [0, 1].
            cam_min = cam.amin(
                dim=(2, 3),
                keepdim=True,
            )

            cam_max = cam.amax(
                dim=(2, 3),
                keepdim=True,
            )

            cam = (
                cam - cam_min
            ) / (
                cam_max - cam_min + 1e-8
            )

            # Detach all returned tensors in output so PyTorch's C++ autograd
            # engine immediately destroys and frees the forward computation graph.
            detached_output = {}
            for key, val in output.items():
                if isinstance(val, torch.Tensor):
                    detached_output[key] = val.detach()
                else:
                    detached_output[key] = val

            return {
                "heatmap": cam.detach(),
                "target_class": int(target_class),
                "predicted_class": predicted_class,
                "probabilities": probabilities.detach(),
                "output": detached_output,
            }
        finally:
            self.activations = None
            self.gradients = None
            self.model.zero_grad(set_to_none=True)
