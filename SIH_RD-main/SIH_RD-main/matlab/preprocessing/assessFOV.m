function fov_stats = assessFOV(img)
%ASSESSFOV Estimate retinal field of view coverage for fundus images.
%
%   fov_stats = assessFOV(img)
%
% Inputs:
%   img - uint8 RGB or grayscale image array
%
% Outputs:
%   fov_stats - struct with fields:
%               - retinal_field_coverage (0.0 to 1.0)
%               - background_pixel_fraction (0.0 to 1.0)

if ischar(img) || isstring(img)
    img = imread(img);
end

bg_threshold = 10;

if size(img, 3) == 3
    max_channel = max(img, [], 3);
else
    max_channel = img;
end

field_mask = max_channel > bg_threshold;
retinal_coverage = double(mean(field_mask(:)));
bg_fraction = 1.0 - retinal_coverage;

fov_stats = struct();
fov_stats.retinal_field_coverage = retinal_coverage;
fov_stats.background_pixel_fraction = bg_fraction;

end
