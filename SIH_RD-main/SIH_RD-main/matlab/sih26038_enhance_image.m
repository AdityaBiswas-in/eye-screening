function [enhanced_img, applied_ops] = sih26038_enhance_image(img, config)
%SIH26038_ENHANCE_IMAGE Configurable, deterministic retinal image enhancement.
%
%   [enhanced_img, applied_ops] = sih26038_enhance_image(img, config)
%
% Inputs:
%   img    - uint8 RGB image array [H x W x 3]
%   config - struct with optional boolean fields:
%            .clahe (default: false)
%            .illumination_normalization (default: false)
%            .denoise (default: false)
%
% Outputs:
%   enhanced_img - uint8 RGB enhanced image array
%   applied_ops  - cell array of strings listing operations applied
%
% Note: All enhancement operations are optional and disabled by default.
%       Denoising is conservative (3x3 median) to avoid erasing fine lesions.

if nargin < 2 || isempty(config)
    config = struct('clahe', false, 'illumination_normalization', false, 'denoise', false);
end

if ~isfield(config, 'clahe')
    config.clahe = false;
end
if ~isfield(config, 'illumination_normalization')
    config.illumination_normalization = false;
end
if ~isfield(config, 'denoise')
    config.denoise = false;
end

enhanced_img = img;
applied_ops = {};

% 1. Illumination Normalization (bounded global exposure scaling)
if config.illumination_normalization
    rgb_double = double(enhanced_img);
    lum = 0.2126 * rgb_double(:,:,1) + 0.7152 * rgb_double(:,:,2) + 0.0722 * rgb_double(:,:,3);
    target_mean = 110.0;
    current_mean = max(1.0, mean(lum(:)));
    scale_factor = target_mean / current_mean;
    scale_factor = min(1.8, max(0.6, scale_factor)); % Bounded scaling
    
    rgb_scaled = rgb_double * scale_factor;
    enhanced_img = uint8(min(255, max(0, rgb_scaled)));
    applied_ops{end+1} = 'bounded_illumination_normalization';
end

% 2. Conservative Denoising (3x3 Median Filter per channel)
if config.denoise
    for c = 1:3
        enhanced_img(:,:,c) = medfilt2(enhanced_img(:,:,c), [3 3]);
    end
    applied_ops{end+1} = 'experimental_median_denoise';
end

% 3. Luminance-only CLAHE (Contrast-Limited Adaptive Histogram Equalization)
if config.clahe
    % Convert to Lab color space if Image Processing Toolbox functions exist
    if exist('rgb2lab', 'file') && exist('lab2rgb', 'file') && exist('adapthisteq', 'file')
        lab = rgb2lab(enhanced_img);
        l_chan = lab(:,:,1) / 100.0; % Normalize 0-1
        l_enhanced = adapthisteq(l_chan, 'ClipLimit', 0.02, 'NumTiles', [8 8]);
        lab(:,:,1) = l_enhanced * 100.0;
        enhanced_img = uint8(lab2rgb(lab) * 255.0);
        applied_ops{end+1} = 'experimental_clahe_luminance';
    end
end

end
