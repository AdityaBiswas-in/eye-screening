"""Explanation stability evaluation for SIH-26038 (EXPERIMENTAL).

Tests whether Grad-CAM explanations remain reasonably stable under small
clinically irrelevant image perturbations.

MOTIVATION:
  A good explanation should not change dramatically when a clinically
  irrelevant perturbation (small brightness change, mild noise, slight
  translation) is applied to the image. Instability suggests sensitivity
  to irrelevant details.

PERTURBATION PROTOCOL:
  All perturbations are defined explicitly. None are arbitrary clinical thresholds.

  1. brightness_plus10: Increase all pixel values by 10/255 (clipped to [0,1])
  2. brightness_minus10: Decrease all pixel values by 10/255 (clipped to [0,1])
  3. contrast_plus10pct: Multiply deviation from mean by 1.1
  4. contrast_minus10pct: Multiply deviation from mean by 0.9
  5. translation_5px_right: Translate image 5 pixels right (edge-filled with mean)
  6. gaussian_noise_sigma2: Add Gaussian noise with σ=2/255

METRIC:
  Cosine similarity between flattened original and perturbed Grad-CAM maps.
  Values near 1.0 = stable; values near 0.0 = unstable.

  Cosine similarity = (A · B) / (|A| |B|)

  We use cosine similarity (not L2 distance) because heatmap scale can change;
  we care about spatial pattern stability, not magnitude stability.

NOT CLAIMED:
  - That a specific cosine similarity threshold defines "acceptable" stability.
  - That instability is clinically dangerous.
  These are research observations only.

STATUS: EXPERIMENTAL / NOT CLINICALLY VALIDATED
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np


# ---------------------------------------------------------------------------
# Perturbation functions
# ---------------------------------------------------------------------------

def _brightness_shift(image: np.ndarray, delta: float) -> np.ndarray:
    """Add a constant delta (in [0,1] space) to all pixels, clipped."""
    return np.clip(image + delta, 0.0, 1.0).astype(image.dtype)


def _contrast_scale(image: np.ndarray, scale: float) -> np.ndarray:
    """Scale pixel values around the per-channel mean."""
    mean = np.mean(image, axis=(0, 1), keepdims=True)
    return np.clip(mean + (image - mean) * scale, 0.0, 1.0).astype(image.dtype)


def _translate_right(image: np.ndarray, pixels: int) -> np.ndarray:
    """Translate image right by `pixels` columns. Fill with column mean."""
    out = np.copy(image)
    if pixels <= 0 or pixels >= image.shape[1]:
        return out
    out[:, pixels:] = image[:, :-pixels]
    col_mean = np.mean(image[:, :pixels], axis=1, keepdims=True)
    out[:, :pixels] = col_mean
    return out


def _gaussian_noise(image: np.ndarray, sigma_255: float, rng_seed: int = 42) -> np.ndarray:
    """Add Gaussian noise with given standard deviation (in 0-255 scale)."""
    rng = np.random.default_rng(rng_seed)
    sigma = sigma_255 / 255.0
    noise = rng.normal(0, sigma, image.shape).astype(image.dtype)
    return np.clip(image + noise, 0.0, 1.0).astype(image.dtype)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two flattened arrays."""
    a_flat = a.flatten().astype(np.float64)
    b_flat = b.flatten().astype(np.float64)
    norm_a = np.linalg.norm(a_flat)
    norm_b = np.linalg.norm(b_flat)
    if norm_a < 1e-12 or norm_b < 1e-12:
        return float("nan")  # Undefined for zero-norm maps
    return float(np.dot(a_flat, b_flat) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Perturbation registry
# ---------------------------------------------------------------------------

PERTURBATIONS = {
    "brightness_plus10": lambda img: _brightness_shift(img, 10.0 / 255.0),
    "brightness_minus10": lambda img: _brightness_shift(img, -10.0 / 255.0),
    "contrast_plus10pct": lambda img: _contrast_scale(img, 1.10),
    "contrast_minus10pct": lambda img: _contrast_scale(img, 0.90),
    "translation_5px_right": lambda img: _translate_right(img, 5),
    "gaussian_noise_sigma2": lambda img: _gaussian_noise(img, sigma_255=2.0),
}


def evaluate_stability(
    image_array: np.ndarray,
    original_heatmap: np.ndarray,
    gradcam_fn,
    perturbation_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Evaluate Grad-CAM stability under defined perturbations.

    Parameters
    ----------
    image_array : np.ndarray, shape (H, W, 3), float32 in [0, 1]
    original_heatmap : np.ndarray, shape (H, W), float32 in [0, 1]
                       Grad-CAM map from the unperturbed image.
    gradcam_fn : callable(image_array) -> np.ndarray
                 Generates a Grad-CAM heatmap for an input image.
    perturbation_names : subset of PERTURBATIONS to evaluate, or None for all.

    Returns
    -------
    Dict with per-perturbation cosine similarity and summary statistics.
    """
    if perturbation_names is None:
        perturbation_names = list(PERTURBATIONS.keys())

    invalid = [n for n in perturbation_names if n not in PERTURBATIONS]
    if invalid:
        return {
            "error": f"Unknown perturbation names: {invalid}",
            "valid_names": list(PERTURBATIONS.keys()),
        }

    per_perturbation = {}
    similarities = []

    for name in perturbation_names:
        perturb_fn = PERTURBATIONS[name]
        try:
            perturbed = perturb_fn(image_array)
            perturbed_heatmap = gradcam_fn(perturbed)
            sim = _cosine_similarity(original_heatmap, perturbed_heatmap)
        except Exception as exc:
            per_perturbation[name] = {
                "cosine_similarity": None,
                "error": str(exc),
            }
            continue

        if not np.isnan(sim):
            similarities.append(sim)

        per_perturbation[name] = {
            "cosine_similarity": sim,
            "interpretation": (
                "Cosine similarity between original and perturbed Grad-CAM. "
                "Near 1.0 = stable spatial pattern; near 0.0 = unstable. "
                "No threshold for 'acceptable' stability is claimed."
            ),
        }

    mean_sim = float(np.mean(similarities)) if similarities else None
    std_sim = float(np.std(similarities)) if similarities else None

    return {
        "method": "stability_under_perturbations",
        "perturbation_protocol": {
            "brightness_plus10": "Add 10/255 to all pixels, clipped to [0,1]",
            "brightness_minus10": "Subtract 10/255 from all pixels, clipped to [0,1]",
            "contrast_plus10pct": "Scale pixel values around channel mean by factor 1.1",
            "contrast_minus10pct": "Scale pixel values around channel mean by factor 0.9",
            "translation_5px_right": "Shift image 5 pixels right, fill left with column mean",
            "gaussian_noise_sigma2": "Add Gaussian noise σ=2/255, seed=42",
        },
        "per_perturbation": per_perturbation,
        "summary": {
            "mean_cosine_similarity": mean_sim,
            "std_cosine_similarity": std_sim,
        },
        "metric_rationale": (
            "Cosine similarity measures spatial pattern agreement between two heatmaps "
            "independently of their absolute scale. "
            "No threshold for 'acceptable' stability is defined — "
            "this is a research observation."
        ),
        "status": "EXPERIMENTAL / NOT CLINICALLY VALIDATED",
        "note": (
            "Stability measures how much the explanation changes under small perturbations. "
            "It does NOT measure clinical accuracy or diagnostic reliability."
        ),
    }
