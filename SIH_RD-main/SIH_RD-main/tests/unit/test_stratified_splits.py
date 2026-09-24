"""Unit tests for generic deterministic stratified split utilities."""

from __future__ import annotations

import sys
import unittest
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from training.datasets.splits import make_three_way_stratified_split


class ThreeWayStratifiedSplitTest(unittest.TestCase):
    def setUp(self) -> None:
        self.labels = [label for label in range(5) for _ in range(100)]
        self.records = list(range(len(self.labels)))

    def test_is_reproducible_for_the_same_seed(self) -> None:
        first = make_three_way_stratified_split(
            self.records, self.labels, 0.6, 0.2, 0.2, seed=123
        )
        second = make_three_way_stratified_split(
            self.records, self.labels, 0.6, 0.2, 0.2, seed=123
        )
        self.assertEqual(first, second)

    def test_preserves_class_representation(self) -> None:
        split = make_three_way_stratified_split(
            self.records, self.labels, 0.6, 0.2, 0.2, seed=123
        )
        for indices, expected_count in (
            (split.train_indices, 60),
            (split.validation_indices, 20),
            (split.test_indices, 20),
        ):
            counts = Counter(self.labels[index] for index in indices)
            self.assertEqual(counts, Counter({label: expected_count for label in range(5)}))

    def test_indices_are_disjoint_and_complete(self) -> None:
        split = make_three_way_stratified_split(
            self.records, self.labels, 0.6, 0.2, 0.2, seed=123
        )
        train, validation, test = map(
            set, (split.train_indices, split.validation_indices, split.test_indices)
        )
        self.assertFalse(train.intersection(validation))
        self.assertFalse(train.intersection(test))
        self.assertFalse(validation.intersection(test))
        self.assertEqual(train | validation | test, set(range(len(self.records))))

    def test_aptos_sized_split_uses_locked_exact_counts(self) -> None:
        labels = [0] * 733 + [1] * 733 + [2] * 732 + [3] * 732 + [4] * 732
        records = list(range(len(labels)))
        split = make_three_way_stratified_split(
            records, labels, 0.70, 0.15, 0.15, seed=42
        )
        self.assertEqual(len(split.train_indices), 2562)
        self.assertEqual(len(split.validation_indices), 550)
        self.assertEqual(len(split.test_indices), 550)
        self.assertEqual(
            set(split.train_indices)
            | set(split.validation_indices)
            | set(split.test_indices),
            set(range(3662)),
        )

    def test_rejects_fractions_that_do_not_sum_to_one(self) -> None:
        with self.assertRaisesRegex(ValueError, "must sum to 1"):
            make_three_way_stratified_split(
                self.records, self.labels, 0.6, 0.2, 0.1, seed=123
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
