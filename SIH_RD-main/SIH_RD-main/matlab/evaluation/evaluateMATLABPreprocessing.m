function report = evaluateMATLABPreprocessing(image_path, config)
%EVALUATEMATLABPREPROCESSING Quantitative evaluation of MATLAB preprocessing.
%
%   report = evaluateMATLABPreprocessing(image_path, config)
%
% Inputs:
%   image_path - string path to input fundus image file
%   config     - struct with enhancement switches (.clahe, .illumination_normalization, .denoise)
%
% Outputs:
%   report - struct comparing raw vs preprocessed quality features

if nargin < 2 || isempty(config)
    config = struct('clahe', true, 'illumination_normalization', true, 'denoise', true);
end

if nargin < 1 || isempty(image_path)
    % Fallback synthetic image if no file provided
    img_raw = zeros(384, 384, 3, 'uint8');
    [X, Y] = meshgrid(1:384, 1:384);
    mask = (X - 192).^2 + (Y - 192).^2 <= 160^2;
    img_raw(:,:,1) = uint8(mask * 140);
    img_raw(:,:,2) = uint8(mask * 65);
    img_raw(:,:,3) = uint8(mask * 25);
else
    img_raw = imread(image_path);
end

raw_features = sih26038_quality_features(img_raw);
[enhanced_img, applied_ops] = sih26038_enhance_image(img_raw, config);
enhanced_features = sih26038_quality_features(enhanced_img);

report = struct();
report.image_path = image_path;
report.applied_operations = applied_ops;
report.raw_features = raw_features;
report.enhanced_features = enhanced_features;

report.delta = struct(...
    'mean_luminance_change', enhanced_features.mean_luminance - raw_features.mean_luminance, ...
    'sharpness_variance_change', enhanced_features.sharpness_laplacian_variance - raw_features.sharpness_laplacian_variance, ...
    'illumination_nonuniformity_change', enhanced_features.illumination_nonuniformity - raw_features.illumination_nonuniformity ...
);

fprintf('========================================================================\n');
fprintf('MATLAB PREPROCESSING QUANTITATIVE EVALUATION REPORT\n');
fprintf('========================================================================\n');
fprintf('Applied Operations: %s\n', strjoin(applied_ops, ', '));
fprintf('Raw Mean Luminance: %.2f  -->  Enhanced Mean Luminance: %.2f (Delta: %+.2f)\n', ...
    raw_features.mean_luminance, enhanced_features.mean_luminance, report.delta.mean_luminance_change);
fprintf('Raw Focus Variance: %.4f -->  Enhanced Focus Variance: %.4f (Delta: %+.4f)\n', ...
    raw_features.sharpness_laplacian_variance, enhanced_features.sharpness_laplacian_variance, report.delta.sharpness_variance_change);
fprintf('Raw Nonuniformity:  %.4f -->  Enhanced Nonuniformity:  %.4f (Delta: %+.4f)\n', ...
    raw_features.illumination_nonuniformity, enhanced_features.illumination_nonuniformity, report.delta.illumination_nonuniformity_change);
fprintf('========================================================================\n');

end
