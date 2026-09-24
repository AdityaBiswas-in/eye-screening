function normalized_img = normalizeIllumination(img, target_mean)
%NORMALIZEILLUMINATION Bounded global exposure normalization for fundus images.
%
%   normalized_img = normalizeIllumination(img, target_mean)
%
% Inputs:
%   img         - uint8 RGB image array [H x W x 3]
%   target_mean - optional target mean luminance (default: 110.0)
%
% Outputs:
%   normalized_img - uint8 RGB normalized image array

if nargin < 2 || isempty(target_mean)
    target_mean = 110.0;
end

if ischar(img) || isstring(img)
    img = imread(img);
end

rgb_double = double(img);
luminance = 0.2126 * rgb_double(:,:,1) + 0.7152 * rgb_double(:,:,2) + 0.0722 * rgb_double(:,:,3);

current_mean = max(1.0, mean(luminance(:)));
scale_factor = target_mean / current_mean;

% Bound scaling to prevent severe distortion
scale_factor = min(1.8, max(0.6, scale_factor));

scaled_rgb = rgb_double * scale_factor;
normalized_img = uint8(min(255, max(0, scaled_rgb)));

end
