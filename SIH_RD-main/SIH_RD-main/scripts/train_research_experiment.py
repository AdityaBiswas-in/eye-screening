"""Train canonical E1/E2 research experiments on the locked APTOS manifest."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from train_e0_resnet50 import _load_config, _seed_everything, select_device
from training.datasets.aptos import AptosDataset, load_aptos_records
from training.evaluation.metrics import compute_dr_metrics
from training.models import build_research_resnet50
from training.preprocessing import build_eval_transform, build_train_transform
from training.utils.aptos_manifest import (
    inverse_frequency_class_weights,
    load_aptos_manifest_records,
)
from training.utils.checkpoints import save_checkpoint
from training.utils.config import AptosConfig


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train canonical E1/E2 research experiments."
    )
    parser.add_argument(
        "experiment",
        choices=("e1", "e2"),
        help="Research experiment to train.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        help="Optional epoch override for a deliberate run.",
    )
    args = parser.parse_args()

    # Use the canonical 384x384 / 10-epoch configuration,
    # matching the E0 training protocol.
    config = _load_config(development=False)
    seed = int(config["seed"])
    _seed_everything(seed)

    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"

    records, failures = load_aptos_records(
        AptosConfig(
            root,
            root / "train.csv",
            root / "train_images",
            "id_code",
            "diagnosis",
            0.15,
            seed,
        ),
        validate_images=False,
    )

    if failures:
        raise RuntimeError(f"Missing APTOS images: {failures[:5]}")

    parts = load_aptos_manifest_records(
        PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv",
        records,
    )

    size = int(config["image_size"])

    train_data = AptosDataset(
        parts["train"],
        build_train_transform(image_size=size),
    )

    validation_data = AptosDataset(
        parts["validation"],
        build_eval_transform(image_size=size),
    )

    generator = torch.Generator().manual_seed(seed)

    train_loader = DataLoader(
        train_data,
        batch_size=int(config["batch_size"]),
        shuffle=True,
        generator=generator,
        num_workers=int(config["num_workers"]),
    )

    validation_loader = DataLoader(
        validation_data,
        batch_size=int(config["batch_size"]),
        shuffle=False,
        num_workers=int(config["num_workers"]),
    )

    device = select_device()
    print(f"selected device: {device}")
    print(f"experiment: {args.experiment}")
    print(f"image_size: {size}")
    print(f"epochs: {args.epochs or int(config['epochs'])}")
    print(f"batch_size: {config['batch_size']}")
    print(f"seed: {seed}")

    model = build_research_resnet50(
        experiment=args.experiment,
        pretrained=True,
    ).to(device)

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=float(config["learning_rate"]),
        weight_decay=float(config["weight_decay"]),
    )
    
    checkpoints_dir = PROJECT_ROOT / "checkpoints"

    existing_checkpoints = sorted(
        checkpoints_dir.glob(f"{args.experiment}_resnet50_epoch_*.pt")
    )

    if existing_checkpoints:
        resume_checkpoint = existing_checkpoints[-1]

        checkpoint_state = torch.load(
            resume_checkpoint,
            map_location=device,
            weights_only=False,
        )

        model.load_state_dict(checkpoint_state["model_state"])
        optimizer.load_state_dict(checkpoint_state["optimizer_state"])

        start_epoch = int(checkpoint_state["epoch"]) + 1

        print(f"resuming_from: {resume_checkpoint}")
        print(f"starting_epoch: {start_epoch}")
    else:
        start_epoch = 1
        print("no existing checkpoint found")
        print("starting_epoch: 1")

    criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(
            inverse_frequency_class_weights(parts["train"]),
            device=device,
        )
    )

    epochs = args.epochs or int(config["epochs"])

    for epoch in range(start_epoch, epochs + 1):
        epoch_started = time.perf_counter()

        model.train()
        training_losses = []

        for images, labels in train_loader:
            optimizer.zero_grad(set_to_none=True)

            logits = model(images.to(device))
            loss = criterion(logits, labels.to(device))

            loss.backward()
            optimizer.step()

            training_losses.append(loss.item())

        model.eval()

        labels = []
        probabilities = []
        validation_losses = []

        with torch.no_grad():
            for images, batch_labels in validation_loader:
                logits = model(images.to(device))

                validation_losses.append(
                    criterion(
                        logits,
                        batch_labels.to(device),
                    ).item()
                )

                probabilities.append(
                    torch.softmax(logits, dim=1)
                    .cpu()
                    .numpy()
                )

                labels.extend(batch_labels.tolist())

        metrics = compute_dr_metrics(
            labels,
            np.concatenate(probabilities),
        )

        checkpoint = (
            PROJECT_ROOT
            / "checkpoints"
            / f"{args.experiment}_resnet50_epoch_{epoch:03d}.pt"
        )

        save_checkpoint(
            checkpoint,
            model,
            optimizer,
            epoch,
            metrics,
            config,
            seed,
        )

        print(
            f"experiment={args.experiment} "
            f"epoch={epoch} "
            f"train_loss={np.mean(training_losses):.6f} "
            f"validation_loss={np.mean(validation_losses):.6f} "
            f"validation={metrics} "
            f"wall_clock_seconds="
            f"{time.perf_counter() - epoch_started:.6f} "
            f"checkpoint={checkpoint}"
        )


if __name__ == "__main__":
    main()