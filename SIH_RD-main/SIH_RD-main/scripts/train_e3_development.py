"""E3 entry point; requires verified local IDRiD lesion data and annotation mapping."""
from __future__ import annotations
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

def main() -> None:
    root = os.environ.get("IDRID_DATASET_ROOT")
    if not root or not Path(root).is_dir():
        raise RuntimeError(
            "E3 training is blocked: IDRiD is NOT_DOWNLOADED locally. Set IDRID_DATASET_ROOT only after "
            "verifying the official image/mask layout, MA/HE/EX/SE mask encoding, and the 81-image alignment. "
            "No lesion masks are fabricated and APTOS remains the locked grading split."
        )
    raise RuntimeError(
        "E3 training is TODO/VERIFY: local IDRiD files exist but no verified image-to-mask manifest or annotation "
        "encoding parser is implemented. Confirm those facts before enabling partial lesion supervision."
    )

if __name__ == "__main__": main()
