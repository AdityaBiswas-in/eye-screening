function features = sih26038_quality_features(img)
%SIH26038_QUALITY_FEATURES Deterministic image quality features for fundus images.
%
%   features = sih26038_quality_features(img)
%
% Inputs:
%   img - uint8 RGB image array [H x W x 3] or image file path string.
%
% Outputs:
%   features - struct containing deterministic image measurements:
%       - width, height, aspect_ratio
%       - sharpness_laplacian_variance (Focus metric)
%       - mean_luminance, luminance_stddev, luminance_p05, luminance_p95
%       - illumination_nonuniformity (Quadrant stddev)
%       - dark_pixel_fraction, saturated_pixel_fraction
%       - retinal_field_coverage, background_pixel_fraction
%
% Note: These are numeric image features, NOT clinically validated gradability labels.

if ischar(img) || isstring(img)
    img = imread(img);
end

if size(img, 3) == 1
    rgb = cat(3, img, img, img);
else
    rgb = img;
end

rgb_double = double(rgb);
H = size(rgb, 1);
W = size(rgb, 2);

% Rec. 709 Luminance
luminance = 0.2126 * rgb_double(:,:,1) + 0.7152 * rgb_double(:,:,2) + 0.0722 * rgb_double(:,:,3);

% 1. Focus assessment: Discrete 4-neighbor Laplacian variance
if H >= 3 && W >= 3
    center = luminance(2:end-1, 2:end-1);
    laplacian = 4.0 * center ...
        - luminance(1:end-2, 2:end-1) ...
        - luminance(3:end, 2:end-1) ...
        - luminance(2:end-1, 1:end-2) ...
        - luminance(2:end-1, 3:end);
    sharpness_var = var(laplacian(:));
else
    sharpness_var = 0.0;
end

% 2. Illumination statistics
bg_threshold = 10;
sat_threshold = 245;

mean_lum = mean(luminance(:));
std_lum = std(luminance(:));

sorted_lum = sort(luminance(:));
N = numel(sorted_lum);
p05_idx = max(1, round(0.05 * N));
p95_idx = min(N, round(0.95 * N));
p05_lum = sorted_lum(p05_idx);
p95_lum = sorted_lum(p95_idx);

% Illumination Nonuniformity: Standard deviation of 4 quadrant means
mid_y = max(1, floor(H / 2));
mid_x = max(1, floor(W / 2));

q1 = luminance(1:mid_y, 1:mid_x);
q2 = luminance(1:mid_y, mid_x+1:end);
q3 = luminance(mid_y+1:end, 1:mid_x);
q4 = luminance(mid_y+1:end, mid_x+1:end);

q_means = [mean(q1(:)), mean(q2(:)), mean(q3(:)), mean(q4(:))];
illum_nonuniformity = std(q_means);

dark_pixels = sum(luminance(:) <= bg_threshold);
sat_pixels = sum(luminance(:) >= sat_threshold);
dark_frac = dark_pixels / N;
sat_frac = sat_pixels / N;

% 3. Field of View (retinal field coverage)
max_channel = max(rgb, [], 3);
field_mask = max_channel > bg_threshold;
retinal_coverage = mean(field_mask(:));
bg_frac = 1.0 - retinal_coverage;

% Assemble output struct
features = struct();
features.width = W;
features.height = H;
features.aspect_ratio = double(W) / double(H);
features.sharpness_laplacian_variance = double(sharpness_var);
features.mean_luminance = double(mean_lum);
features.luminance_stddev = double(std_lum);
features.luminance_p05 = double(p05_lum);
features.luminance_p95 = double(p95_lum);
features.illumination_nonuniformity = double(illum_nonuniformity);
features.dark_pixel_fraction = double(dark_frac);
features.saturated_pixel_fraction = double(sat_frac);
features.retinal_field_coverage = double(retinal_coverage);
features.background_pixel_fraction = double(bg_frac);

end
