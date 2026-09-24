function illum_stats = assessIllumination(img)
%ASSESSILLUMINATION Compute illumination statistics for fundus images.
%
%   illum_stats = assessIllumination(img)
%
% Inputs:
%   img - uint8 RGB or grayscale image array
%
% Outputs:
%   illum_stats - struct containing illumination measurements:
%                 - mean_luminance
%                 - luminance_stddev
%                 - luminance_p05, luminance_p95
%                 - illumination_nonuniformity (Quadrant stddev)
%                 - dark_pixel_fraction (<= 10)
%                 - saturated_pixel_fraction (>= 245)

if ischar(img) || isstring(img)
    img = imread(img);
end

if size(img, 3) == 3
    rgb_double = double(img);
    luminance = 0.2126 * rgb_double(:,:,1) + 0.7152 * rgb_double(:,:,2) + 0.0722 * rgb_double(:,:,3);
else
    luminance = double(img);
end

[H, W] = size(luminance);
N = numel(luminance);

bg_thresh = 10;
sat_thresh = 245;

mean_lum = mean(luminance(:));
std_lum = std(luminance(:));

sorted_lum = sort(luminance(:));
p05_idx = max(1, round(0.05 * N));
p95_idx = min(N, round(0.95 * N));
p05_lum = sorted_lum(p05_idx);
p95_lum = sorted_lum(p95_idx);

mid_y = max(1, floor(H / 2));
mid_x = max(1, floor(W / 2));

q1 = luminance(1:mid_y, 1:mid_x);
q2 = luminance(1:mid_y, mid_x+1:end);
q3 = luminance(mid_y+1:end, 1:mid_x);
q4 = luminance(mid_y+1:end, mid_x+1:end);

q_means = [mean(q1(:)), mean(q2(:)), mean(q3(:)), mean(q4(:))];
nonuniformity = std(q_means);

dark_frac = sum(luminance(:) <= bg_thresh) / N;
sat_frac = sum(luminance(:) >= sat_thresh) / N;

illum_stats = struct();
illum_stats.mean_luminance = double(mean_lum);
illum_stats.luminance_stddev = double(std_lum);
illum_stats.luminance_p05 = double(p05_lum);
illum_stats.luminance_p95 = double(p95_lum);
illum_stats.illumination_nonuniformity = double(nonuniformity);
illum_stats.dark_pixel_fraction = double(dark_frac);
illum_stats.saturated_pixel_fraction = double(sat_frac);

end
