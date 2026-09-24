"""Reproducible, label-stratified train/validation splitting."""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil, isclose
from typing import Sequence, TypeVar

from sklearn.model_selection import StratifiedShuffleSplit


T = TypeVar("T")


@dataclass(frozen=True)
class StratifiedSplit:
    train_indices: list[int]
    validation_indices: list[int]


@dataclass(frozen=True)
class ThreeWayStratifiedSplit:
    """Indices for a reproducible train/validation/test partition."""

    train_indices: list[int]
    validation_indices: list[int]
    test_indices: list[int]


def make_stratified_split(
    records: Sequence[T], labels: Sequence[int], validation_fraction: float, seed: int
) -> StratifiedSplit:
    """Create a deterministic split with each class represented proportionally."""

    if len(records) != len(labels):
        raise ValueError("records and labels must have the same length.")
    if len(records) < 2:
        raise ValueError("At least two records are required for a train/validation split.")
    if not 0.0 < validation_fraction < 1.0:
        raise ValueError("validation_fraction must be between 0 and 1.")

    splitter = StratifiedShuffleSplit(
        n_splits=1, test_size=validation_fraction, random_state=seed
    )
    try:
        train_indices, validation_indices = next(splitter.split(range(len(records)), labels))
    except ValueError as error:
        raise ValueError(
            "Unable to create a stratified split. Each DR class needs enough valid "
            "samples for the selected validation fraction."
        ) from error
    return StratifiedSplit(train_indices.tolist(), validation_indices.tolist())


def make_three_way_stratified_split(
    records: Sequence[T],
    labels: Sequence[int],
    train_fraction: float,
    validation_fraction: float,
    test_fraction: float,
    seed: int,
) -> ThreeWayStratifiedSplit:
    """Create deterministic, label-stratified train/validation/test indices.

    The test set is selected first. The remaining records are then split into
    train and validation sets. Both operations use ``StratifiedShuffleSplit``
    with deterministic seeds derived from ``seed``.
    """

    if len(records) != len(labels):
        raise ValueError("records and labels must have the same length.")
    if len(records) < 3:
        raise ValueError("At least three records are required for a three-way split.")
    fractions = (train_fraction, validation_fraction, test_fraction)
    if any(not 0.0 < fraction < 1.0 for fraction in fractions):
        raise ValueError("train, validation, and test fractions must each be between 0 and 1.")
    if not isclose(sum(fractions), 1.0, rel_tol=0.0, abs_tol=1e-9):
        raise ValueError("train, validation, and test fractions must sum to 1.")

    test_splitter = StratifiedShuffleSplit(
        n_splits=1, test_size=test_fraction, random_state=seed
    )
    try:
        remaining_indices, test_indices = next(
            test_splitter.split(range(len(records)), labels)
        )
        remaining_labels = [labels[index] for index in remaining_indices]
        # ``StratifiedShuffleSplit`` rounds a fractional test size up. Mirror that
        # rule for the second stage so both requested holdout fractions receive
        # their deterministic ceiling allocation and train receives the remainder.
        validation_count = ceil(len(records) * validation_fraction)
        validation_splitter = StratifiedShuffleSplit(
            n_splits=1, test_size=validation_count, random_state=seed + 1
        )
        train_relative, validation_relative = next(
            validation_splitter.split(remaining_indices, remaining_labels)
        )
    except ValueError as error:
        raise ValueError(
            "Unable to create a three-way stratified split. Each class needs enough "
            "samples for the selected train, validation, and test fractions."
        ) from error

    train_indices = remaining_indices[train_relative].tolist()
    validation_indices = remaining_indices[validation_relative].tolist()
    return ThreeWayStratifiedSplit(
        train_indices=train_indices,
        validation_indices=validation_indices,
        test_indices=test_indices.tolist(),
    )
