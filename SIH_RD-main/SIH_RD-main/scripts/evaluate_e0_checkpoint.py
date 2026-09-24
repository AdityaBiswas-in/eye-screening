"""Evaluate the completed E0 development checkpoint on the locked APTOS test split."""
from __future__ import annotations
import argparse
import sys
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
from train_e0_resnet50 import _load_config, select_device
from training.datasets.aptos import AptosDataset, load_aptos_records
from training.evaluation.metrics import compute_dr_metrics
from training.models import build_resnet50_baseline
from training.preprocessing import build_eval_transform
from training.utils.aptos_manifest import load_aptos_manifest_records
from training.utils.config import AptosConfig

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    arguments = parser.parse_args()
    config = _load_config()
    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    records, failures = load_aptos_records(AptosConfig(root, root/"train.csv", root/"train_images", "id_code", "diagnosis", .15, 42), validate_images=False)
    if failures: raise RuntimeError("Missing APTOS images")
    parts = load_aptos_manifest_records(PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records)
    loader = DataLoader(AptosDataset(parts["test"], build_eval_transform(image_size=384)), batch_size=8, shuffle=False)
    device = select_device(); model = build_resnet50_baseline(pretrained=False).to(device)
    state = torch.load(arguments.checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(state["model_state"]); model.eval(); labels=[]; probabilities=[]
    with torch.no_grad():
        for images, batch_labels in loader:
            probabilities.append(torch.softmax(model(images.to(device)), 1).cpu().numpy()); labels.extend(batch_labels.tolist())
    print(compute_dr_metrics(labels, np.concatenate(probabilities)))
if __name__ == "__main__": main()
