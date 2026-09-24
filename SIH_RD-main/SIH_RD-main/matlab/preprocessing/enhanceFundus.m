function [enhanced_img, applied_ops] = enhanceFundus(img, config)
%ENHANCEFUNDUS Orchestrate configurable adaptive enhancement pipeline.
%
%   [enhanced_img, applied_ops] = enhanceFundus(img, config)
%
% Inputs:
%   img    - uint8 RGB image array
%   config - struct with boolean fields (.clahe, .illumination_normalization, .denoise)
%
% Outputs:
%   enhanced_img - uint8 RGB enhanced image array
%   applied_ops  - cell array of strings listing operations applied

if nargin < 2 || isempty(config)
    config = struct('clahe', false, 'illumination_normalization', false, 'denoise', false);
end

if ischar(img) || isstring(img)
    img = imread(img);
end

enhanced_img = img;
applied_ops = {};

if isfield(config, 'illumination_normalization') && config.illumination_normalization
    enhanced_img = normalizeIllumination(enhanced_img);
    applied_ops{end+1} = 'bounded_illumination_normalization';
end

if isfield(config, 'denoise') && config.denoise
    enhanced_img = denoiseFundus(enhanced_img);
    applied_ops{end+1} = 'experimental_median_denoise';
end

if isfield(config, 'clahe') && config.clahe
    enhanced_img = applyCLAHE(enhanced_img);
    applied_ops{end+1} = 'experimental_clahe_luminance';
end

end
