function [quality_result, processed_img] = sih26038_quality_assessment(img, enhance_config)
%SIH26038_QUALITY_ASSESSMENT Overall image quality analysis and enhancement pipeline.
%
%   [quality_result, processed_img] = sih26038_quality_assessment(img, enhance_config)
%
% Inputs:
%   img            - uint8 RGB image array [H x W x 3] or image file path.
%   enhance_config - struct with optional enhancement switches (.clahe, .illumination_normalization, .denoise).
%
% Outputs:
%   quality_result - struct with structured quality fields:
%                    .features - struct of numeric quality measurements
%                    .enhancement_applied - cell array of applied operations
%                    .decision_status - 'NOT_CLINICALLY_VALIDATED'
%                    .gradability_status - 'FEATURES_AVAILABLE'
%                    .experimental_only - true
%                    .recapture_recommended - false (no validated threshold)
%   processed_img  - uint8 RGB processed image ready for E9 inference

if nargin < 2
    enhance_config = struct('clahe', false, 'illumination_normalization', false, 'denoise', false);
end

if ischar(img) || isstring(img)
    img = imread(img);
end

% 1. Measure deterministic features
features = sih26038_quality_features(img);

% 2. Apply enhancement routing if configured
[processed_img, applied_ops] = sih26038_enhance_image(img, enhance_config);

% 3. Assemble structured quality decision
quality_result = struct();
quality_result.features = features;
quality_result.enhancement_applied = applied_ops;
quality_result.decision_status = 'NOT_CLINICALLY_VALIDATED';
quality_result.gradability_status = 'FEATURES_AVAILABLE';
quality_result.experimental_only = true;
quality_result.recapture_recommended = false;
quality_result.note = 'No validated clinical gradability threshold is configured; image is not automatically rejected.';

end
