function contract = createInferenceContract(quality_result, input_metadata)
%CREATEINFERENCECONTRACT Format integration contract payload for Python E9 API.
%
%   contract = createInferenceContract(quality_result, input_metadata)
%
% Inputs:
%   quality_result - struct from sih26038_quality_assessment
%   input_metadata - struct from prepareInferenceInput
%
% Outputs:
%   contract - struct representing portable API integration metadata

contract = struct();
contract.contract_version = '1.0.0';
contract.status = 'E9_INFERENCE_EXTERNAL_PYTHON';
contract.target_endpoint = 'POST /predict';
contract.python_inference_owner = 'Python FastAPI Backend (app/main.py)';
contract.primary_model = 'E9 (ResNet-50 + MHSA + Direct Referable Head)';
contract.checkpoint = 'checkpoints/e9_full_referable_best.pt';

contract.matlab_quality = quality_result;
contract.input_spec = input_metadata;

contract.notes = struct(...
    'gradability', 'Features available; no validated clinical gradability threshold configured.', ...
    'interoperability', 'MATLAB Online disjunction handled via portable integration payload.', ...
    'authoritative_ai', 'Python/PyTorch E9 model handles 5-class DR grading, referable head, calibration, conformal sets, evidence gating, and Grad-CAM.' ...
);

end
