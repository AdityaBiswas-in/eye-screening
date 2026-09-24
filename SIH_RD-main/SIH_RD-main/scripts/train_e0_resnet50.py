"""Config-driven E0 ResNet-50 training entry point; never runs automatically."""

from __future__ import annotations

import argparse
import random
import sys
import tomllib
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.aptos import AptosDataset, load_aptos_records
from training.evaluation.metrics import compute_dr_metrics
from training.models import build_resnet50_baseline
from training.preprocessing import build_eval_transform, build_train_transform
from training.utils.aptos_manifest import inverse_frequency_class_weights, load_aptos_manifest_records
from training.utils.checkpoints import save_checkpoint
from training.utils.config import AptosConfig


def _load_config(*, development: bool = False) -> dict[str, object]:
    with (PROJECT_ROOT / "configs" / "model.toml").open("rb") as handle:
        configuration = tomllib.load(handle)
    return configuration["e0_development" if development else "e0_training"]


def _seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def select_device(
    *, cuda_available: bool | None = None, mps_available: bool | None = None
) -> torch.device:
    """Prefer CUDA, then Apple MPS, then CPU; injectable flags support tests."""

    has_cuda = torch.cuda.is_available() if cuda_available is None else cuda_available
    has_mps = torch.backends.mps.is_available() if mps_available is None else mps_available
    if has_cuda:
        return torch.device("cuda")
    if has_mps:
        return torch.device("mps")
    return torch.device("cpu")


def _synchronize_device(device: torch.device) -> None:
    """Wait for queued accelerator work when timing the diagnostic mode."""

    if device.type == "mps":
        torch.mps.synchronize()
    elif device.type == "cuda":
        torch.cuda.synchronize(device)


def _run_one_batch_diagnostic(
    train_loader: DataLoader,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> None:
    """Time one real E0 batch and exit without validation or checkpointing."""

    batch_start = time.perf_counter()
    print(f"DataLoader retrieval start: {batch_start:.6f}")
    images, labels = next(iter(train_loader))
    batch_end = time.perf_counter()
    print(f"DataLoader retrieval end: {batch_end:.6f} ({batch_end - batch_start:.6f} s)")

    _synchronize_device(device)
    transfer_start = time.perf_counter()
    print(f"device transfer start: {transfer_start:.6f}")
    device_images, device_labels = images.to(device), labels.to(device)
    _synchronize_device(device)
    transfer_end = time.perf_counter()
    print(f"device transfer end: {transfer_end:.6f} ({transfer_end - transfer_start:.6f} s)")

    model.train()
    optimizer.zero_grad(set_to_none=True)
    _synchronize_device(device)
    forward_start = time.perf_counter()
    logits = model(device_images)
    _synchronize_device(device)
    forward_end = time.perf_counter()
    print(f"input tensor shape: {tuple(device_images.shape)}")
    print(f"logits shape: {tuple(logits.shape)}")
    print(f"forward pass: {forward_end - forward_start:.6f} s")

    loss = criterion(logits, device_labels)
    _synchronize_device(device)
    backward_start = time.perf_counter()
    loss.backward()
    _synchronize_device(device)
    backward_end = time.perf_counter()
    print(f"backward pass: {backward_end - backward_start:.6f} s")

    _synchronize_device(device)
    optimizer_start = time.perf_counter()
    optimizer.step()
    _synchronize_device(device)
    optimizer_end = time.perf_counter()
    print(f"optimizer step: {optimizer_end - optimizer_start:.6f} s")


def _run_data_loader_diagnostic(train_loader: DataLoader, batch_count: int) -> None:
    """Time exactly ``batch_count`` training-batch retrievals without model work."""

    if batch_count <= 0:
        raise ValueError("--diagnostic-batches must be a positive integer.")
    if batch_count > len(train_loader):
        raise ValueError("--diagnostic-batches exceeds the available training batches.")

    iterator = iter(train_loader)
    retrieval_times: list[float] = []
    for batch_number in range(1, batch_count + 1):
        started = time.perf_counter()
        _ = next(iterator)
        elapsed = time.perf_counter() - started
        retrieval_times.append(elapsed)
        print(f"batch {batch_number}: {elapsed:.6f} s")

    average = sum(retrieval_times) / len(retrieval_times)
    print(f"average retrieval time: {average:.6f} s")
    print(f"first-batch retrieval time: {retrieval_times[0]:.6f} s")
    if len(retrieval_times) > 1:
        later_average = sum(retrieval_times[1:]) / (len(retrieval_times) - 1)
        print(f"average retrieval time from batch 2 onward: {later_average:.6f} s")


def _run_cache_diagnostic(train_data: AptosDataset) -> None:
    """Compare cache population and cache-hit retrieval for the same 20 samples."""

    sample_count = 20
    cache_loader = DataLoader(train_data, batch_size=1, shuffle=False, num_workers=0)

    def retrieve_pass() -> float:
        iterator = iter(cache_loader)
        started = time.perf_counter()
        for _ in range(sample_count):
            _ = next(iterator)
        return time.perf_counter() - started

    first_pass_seconds = retrieve_pass()
    second_pass_seconds = retrieve_pass()
    print(f"pass 1 total time: {first_pass_seconds:.6f} s")
    print(f"pass 1 average per image: {first_pass_seconds / sample_count:.6f} s")
    print(f"pass 2 total time: {second_pass_seconds:.6f} s")
    print(f"pass 2 average per image: {second_pass_seconds / sample_count:.6f} s")
    print(f"speedup: {first_pass_seconds / second_pass_seconds:.2f}x")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, help="Optional config override for a deliberate run.")
    parser.add_argument(
        "--development",
        action="store_true",
        help="Use the explicit 224x224, one-epoch E0 development configuration.",
    )
    parser.add_argument(
        "--diagnostic-one-batch",
        action="store_true",
        help="Time one real training batch, then exit without validation or checkpointing.",
    )
    parser.add_argument(
        "--diagnostic-batches",
        type=int,
        metavar="N",
        help="Time N training-batch retrievals, then exit without model work.",
    )
    parser.add_argument(
        "--diagnostic-cache",
        action="store_true",
        help="Compare two deterministic 20-sample passes through the same crop-bounds cache.",
    )
    arguments = parser.parse_args()
    config = _load_config(development=arguments.development)
    seed = int(config["seed"])
    _seed_everything(seed)
    root = PROJECT_ROOT / "data" / "aptos" / "aptos2019"
    data_config = AptosConfig(root, root / "train.csv", root / "train_images", "id_code", "diagnosis", 0.15, seed)
    records, failures = load_aptos_records(data_config, validate_images=True)
    if failures:
        raise RuntimeError("E0 training requires all manifest images to be readable.")
    partitions = load_aptos_manifest_records(PROJECT_ROOT / "data" / "aptos" / "aptos2019_split_manifest.csv", records)
    image_size = int(config["image_size"])
    train_data = AptosDataset(partitions["train"], build_train_transform(image_size=image_size))
    validation_data = AptosDataset(partitions["validation"], build_eval_transform(image_size=image_size))
    generator = torch.Generator().manual_seed(seed)
    train_loader = DataLoader(train_data, batch_size=int(config["batch_size"]), shuffle=True, generator=generator, num_workers=int(config["num_workers"]))
    validation_loader = DataLoader(validation_data, batch_size=int(config["batch_size"]), shuffle=False, num_workers=int(config["num_workers"]))
    if arguments.diagnostic_cache:
        _run_cache_diagnostic(train_data)
        return
    if arguments.diagnostic_batches is not None:
        _run_data_loader_diagnostic(train_loader, arguments.diagnostic_batches)
        return
    device = select_device()
    print(f"selected device: {device}")
    model = build_resnet50_baseline(pretrained=bool(config["pretrained"])) .to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(config["learning_rate"]), weight_decay=float(config["weight_decay"]))
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(inverse_frequency_class_weights(partitions["train"]), device=device))
    if arguments.diagnostic_one_batch:
        _run_one_batch_diagnostic(train_loader, model, optimizer, criterion, device)
        return
    epochs = arguments.epochs or int(config["epochs"])
    for epoch in range(1, epochs + 1):
        epoch_started = time.perf_counter()
        model.train()
        training_losses = []
        for images, labels in train_loader:
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images.to(device)), labels.to(device))
            loss.backward()
            optimizer.step()
            training_losses.append(loss.item())
        model.eval()
        labels, probabilities = [], []
        validation_losses = []
        with torch.no_grad():
            for images, batch_labels in validation_loader:
                logits = model(images.to(device))
                validation_losses.append(criterion(logits, batch_labels.to(device)).item())
                probabilities.append(torch.softmax(logits, dim=1).cpu().numpy())
                labels.extend(batch_labels.tolist())
        metrics = compute_dr_metrics(labels, np.concatenate(probabilities))
        checkpoint = PROJECT_ROOT / "checkpoints" / f"e0_resnet50_epoch_{epoch:03d}.pt"
        save_checkpoint(checkpoint, model, optimizer, epoch, metrics, config, seed)
        print(
            f"epoch={epoch} train_loss={np.mean(training_losses):.6f} "
            f"validation_loss={np.mean(validation_losses):.6f} validation={metrics} "
            f"wall_clock_seconds={time.perf_counter() - epoch_started:.6f}"
        )


if __name__ == "__main__":
    main()
