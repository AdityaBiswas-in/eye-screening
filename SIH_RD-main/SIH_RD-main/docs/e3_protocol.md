# E3: Partial-Supervision Lesion-Aware Grading

E3 extends E2 with a four-channel MA, HE, EX, and SE lesion head from the shared ResNet-50 deepest feature map. Its lesion-derived pooled representation is fused with the existing four-head MHSA grading representation before the five-grade classifier.

Lesion supervision is partial: the Dice plus BCE-with-logits loss is computed only for samples whose verified IDRiD lesion annotation is available. Missing annotation is excluded from lesion loss and never interpreted as an all-negative mask. APTOS remains the locked source of grading supervision; IDRiD provenance must remain separate.

The E3 lesion branch is experimentally supervised using available IDRiD lesion annotations; it is not a clinically validated lesion detector.

TODO/VERIFY: IDRiD is currently not downloaded locally. Before training, verify its official image/mask layout, the exact MA/HE/EX/SE mask pixel encoding, 81-image alignment, and joint image/mask crop/resize procedure. The current PIL image transform cannot safely transform a segmentation mask jointly, so E3 data loading remains deliberately disabled until that verified joint transform is implemented.
