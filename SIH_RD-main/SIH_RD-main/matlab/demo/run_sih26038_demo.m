function run_sih26038_demo(image_path)
%RUN_SIH26038_DEMO MATLAB System Layer Demo for SIH-26038.
%
%   run_sih26038_demo(image_path)
%
% Uses the modular MATLAB preprocessing package to run quality assessment and
% adaptive enhancement on a fundus image, formats the E9 Python inference
% integration contract, and logs structured system outputs.

if nargin < 1 || isempty(image_path)
    default_test = fullfile(fileparts(mfilename('fullpath')), '..', '..', 'data', 'aptos', 'aptos2019', 'train_images', '000c143585c7.png');
    if exist(default_test, 'file')
        image_path = default_test;
    else
        fprintf('No image path provided. Creating a synthetic fundus test image...\n');
        img_data = zeros(384, 384, 3, 'uint8');
        [X, Y] = meshgrid(1:384, 1:384);
        mask = (X - 192).^2 + (Y - 192).^2 <= 160^2;
        img_data(:,:,1) = uint8(mask * 150);
        img_data(:,:,2) = uint8(mask * 70);
        img_data(:,:,3) = uint8(mask * 20);
        image_path = 'synthetic_test_fundus.png';
        imwrite(img_data, image_path);
    end
end

fprintf('========================================================================\n');
fprintf('SIH-26038 MODULAR MATLAB SYSTEM LAYER DEMO\n');
fprintf('========================================================================\n');
fprintf('Input Image: %s\n', image_path);

% 1. Read input image
raw_img = imread(image_path);

% Add preprocessing folder to path if running in MATLAB
addpath(fullfile(fileparts(mfilename('fullpath')), '..', 'preprocessing'));
addpath(fullfile(fileparts(mfilename('fullpath')), '..', 'integration'));

% 2. Modular Feature Extraction
focus_metric = assessFocus(raw_img);
illum_stats = assessIllumination(raw_img);
fov_stats = assessFOV(raw_img);

% 3. Adaptive Enhancement
enhance_config = struct('clahe', false, 'illumination_normalization', true, 'denoise', true);
[enhanced_img, applied_ops] = enhanceFundus(raw_img, enhance_config);

% 4. Format Input Metadata & Contract
[input_img, input_metadata] = prepareInferenceInput(enhanced_img, 384);

quality_result = struct();
quality_result.features = struct(...
    'sharpness_laplacian_variance', focus_metric, ...
    'illumination', illum_stats, ...
    'field_of_view', fov_stats ...
);
quality_result.enhancement_applied = applied_ops;
quality_result.decision_status = 'NOT_CLINICALLY_VALIDATED';
quality_result.gradability_status = 'FEATURES_AVAILABLE';

contract = createInferenceContract(quality_result, input_metadata);

% 5. Log Summary Results
fprintf('\n--- Image Quality Features ---\n');
fprintf('Focus (Laplacian Variance): %.4f\n', focus_metric);
fprintf('Mean Luminance: %.2f | StdDev: %.2f\n', illum_stats.mean_luminance, illum_stats.luminance_stddev);
fprintf('Illumination Nonuniformity: %.4f\n', illum_stats.illumination_nonuniformity);
fprintf('Retinal Field Coverage: %.2f%%\n', fov_stats.retinal_field_coverage * 100);

fprintf('\n--- Processing & Enhancement ---\n');
fprintf('Gradability Status: %s\n', quality_result.gradability_status);
fprintf('Applied Enhancements: %s\n', strjoin(applied_ops, ', '));
fprintf('Processed Input Dimension: %dx%d (%s)\n', input_metadata.target_width, input_metadata.target_height, input_metadata.tensor_layout);

fprintf('\n--- Python E9 AI Integration Contract ---\n');
fprintf('Contract Version: %s\n', contract.contract_version);
fprintf('Integration Status: %s\n', contract.status);
fprintf('Target API Endpoint: %s\n', contract.target_endpoint);
fprintf('Inference Engine Owner: %s\n', contract.python_inference_owner);
fprintf('Primary Model Checkpoint: %s\n', contract.checkpoint);

fprintf('\n========================================================================\n');
fprintf('MATLAB Demo Complete.\n');
fprintf('========================================================================\n');

end
