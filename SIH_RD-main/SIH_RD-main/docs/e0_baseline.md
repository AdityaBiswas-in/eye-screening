# E0: ResNet-50 DR Grading Baseline

E0 is a five-class (`0`–`4`) ResNet-50 baseline using torchvision ImageNet weights and the locked APTOS manifest. It has only one replaced classifier layer with five logits; it does not include lesion, IQA-gating, domain-adaptation, calibration, uncertainty, or XAI components.

Training loads—not regenerates—the 70/15/15 seed-42 manifest. Training uses the existing train transform and validation uses deterministic evaluation preprocessing.

Class imbalance is handled with inverse-frequency weighted cross-entropy computed from training records only. This is a simple baseline that keeps every image and avoids resampling; its impact must be evaluated before it is retained.

Each checkpoint saves model/optimizer states, epoch, validation metrics, configuration, and seed. Metrics include five-class accuracy, macro F1, per-class precision/recall/F1, confusion matrix, quadratic weighted kappa, plus provisional referable-DR (`grade >= 2`) sensitivity, specificity, ROC-AUC, and PR-AUC.

To deliberately start a run after approving the configuration and confirming ImageNet weight availability/network policy:

```bash
python3 scripts/train_e0_resnet50.py
```

The script is not invoked automatically.
