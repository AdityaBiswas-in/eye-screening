function contract = sih26038_integration_spec()
%SIH26038_INTEGRATION_SPEC Non-executed Python/MATLAB interoperability contract.
% NOT VERIFIED: MATLAB is unavailable in the current development environment.
contract.status = 'NOT VERIFIED — MATLAB unavailable';
contract.python_checkpoint = 'checkpoints/e9_full_referable_best.pt';
contract.input_layout = 'NCHW single, [N 3 384 384]';
contract.input_preprocessing = 'RGB, conservative retinal crop, resize 384x384, ImageNet normalization';
contract.outputs = {'dr_logits [N 5]', 'referable_logit [N 1]', 'experimental_ma_he_ex_se_maps', 'attention/evidence representation'};
contract.postprocessing_owner = 'Python: calibration, conformal set, evidence gate, Grad-CAM, JSON report';
contract.required_toolboxes = {'Deep Learning Toolbox', 'Computer Vision Toolbox', 'Image Processing Toolbox'};
contract.verification_checklist = {'Export supported model representation', 'Compare fixed-image Python and MATLAB logits', 'Verify preprocessing tensor equivalence', 'Verify output shape and numerical tolerance'};
end
