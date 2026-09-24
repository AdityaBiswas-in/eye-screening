# Evaluation Protocol

## 1. Research Questions

- **RQ1:** Does quality-aware processing improve DR grading compared with a baseline, once quality supervision or defensible strata are established?
- **RQ2:** Can lesion-guided learning improve DR grading and evidence localization when lesion annotations are available only for a subset of training images?
- **RQ3:** Does a domain-robust representation improve performance on external datasets when valid external ground truth is available?
- **RQ4:** Does calibration plus uncertainty improve selective screening safety?
- **RQ5:** Does evidence-reliability gating reduce unsafe or high-uncertainty reported predictions?

These are hypotheses, not established conclusions.

## 2. Experimental Progression

| Experiment | Added component | Required constraint |
|---|---|---|
| E0 | Baseline DR classifier | Establish five-class reference using only approved grading data. |
| E1 | E0 + quality-aware component | Do not treat APTOS variation as quality ground truth. |
| E2 | E1 + lesion supervision | Respect IDRiD’s partial, unequal lesion-label coverage. |
| E3 | E2 + cross-task evidence/lesion fusion | Compare against E2; fusion mechanism remains a future architecture decision. |
| E4 | E3 + domain robustness | Evaluate externally only when valid external labels exist. |
| E5 | E4 + calibration | Fit/select using development and validation data only. |
| E6 | E5 + ordinal/conformal uncertainty | Evaluate coverage and selective risk without test-set tuning. |
| E7 | E6 + evidence-reliability gate | Pre-specify and validate gate behavior before using it for recommendations. |

Each experiment must be evaluated before adding the next component.

## 3. Metrics

For five-class DR grading, report accuracy, macro F1, per-class precision, per-class recall, confusion matrix, and quadratic weighted kappa. For provisional referable DR (`grade >= 2`), report sensitivity, specificity, ROC-AUC, PR-AUC, PPV, NPV, and F1 only after the relevant dataset’s label semantics have been verified.

Reliability metrics are Expected Calibration Error, Brier score, and Negative Log-Likelihood. Selective-prediction metrics are coverage, selective risk, AURC, and sensitivity/specificity at selected coverage levels. Coverage levels, confidence intervals, repeat/bootstrap policy, and significance testing remain TODO/DEFINE.

Quality results may be stratified only after defensible quality labels/strata are established. Explanation assessment uses lesion-localization agreement, fidelity, stability, and a TODO clinical-review protocol; no single explainability score is defined.

## 4. Internal Evaluation

Development, validation, and internal test data must be disjoint. The exact APTOS split remains TODO pending local inspection, duplicate audit, and metadata review. If patient identifiers are verified, group all images from a patient in one partition.

IDRiD’s official 413/103 disease-grading split is documented and must be preserved unless a later protocol decision explicitly changes its role. Its 81-image lesion subset cannot be treated as if lesion labels cover every grading image.

## 5. External Evaluation

Messidor-2 is a **candidate external/domain-shift dataset requiring verified ground truth**, not a directly usable labeled external DR test set. The official ADCIS release does not contain DR ground-truth annotations. Third-party labels require independent verification of provenance, license, label semantics, and scientific validity before use. Therefore external DR performance on Messidor-2 remains TODO.

No external-test images, labels, or derived statistics may influence development, calibration fitting, threshold selection, or architecture selection. Report any eventual external result separately by dataset/domain.

## 6. Ablation Strategy

| Experiment | Comparison | Core question |
|---|---|---|
| E0 | None | What is the approved grading baseline? |
| E1 | E0 | Does quality awareness help without treating variation as quality labels? |
| E2 | E1 | Does partial lesion supervision improve grading/evidence localization? |
| E3 | E2 | Does cross-task fusion improve over partial lesion supervision alone? |
| E4 | E3 | Does domain robustness improve held-out domain performance where labeled data exist? |
| E5 | E4 | Does calibration improve probability reliability? |
| E6 | E5 | Is uncertainty useful for selective screening? |
| E7 | E6 | Does the reliability gate improve pre-specified safety behavior? |

## 7. Error Analysis

Analyze false negatives, false positives, adjacent-grade errors, poor-quality images only after valid strata exist, lesion disagreements where labels exist, domain-shift failures where valid external labels exist, and uncertain/abstained predictions. Record partition and dataset/domain. Never represent an ungradable image or a failed prediction as “no DR.”

## 8. Reliability Analysis

Calibration, uncertainty, selective prediction, and abstention/review behavior are evaluated on frozen test protocols. The reliability-gate inputs, thresholds, actions, and harm-aware analysis are TODO/DEFINE and must be pre-specified before clinical-facing use.

## 9. Explanation Evaluation

Grad-CAM++ and lesion evidence are candidate outputs, not proof of clinical validity. Assess them against available lesion annotations, document failure cases, and establish clinical review before presenting them as useful evidence. Visually plausible heatmaps are insufficient.

## 10. Reproducibility

Record random seeds, immutable configuration snapshots, dataset source/release, partition manifests, model/checkpoint identity when models exist, experiment IDs, code revision, runtime details, raw metric logs, exclusions, and error-analysis artifacts.

## 11. Final Model Selection

Do not select a winner now. Final selection requires internal-test evaluation, valid external validation, calibration analysis, uncertainty/selective evaluation, explanation evaluation, and ablation comparison. Any future deployment retains the single public `POST /predict` endpoint.
