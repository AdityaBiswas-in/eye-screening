function focus_metric = assessFocus(img)
%ASSESSFOCUS Compute image sharpness metric using Laplacian variance.
%
%   focus_metric = assessFocus(img)
%
% Inputs:
%   img - uint8 RGB or grayscale image array
%
% Outputs:
%   focus_metric - double scalar representing Laplacian variance (sharpness proxy)
%
% Note: Numeric feature only; not a clinically validated gradability threshold.

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
if H >= 3 && W >= 3
    center = luminance(2:end-1, 2:end-1);
    laplacian = 4.0 * center ...
        - luminance(1:end-2, 2:end-1) ...
        - luminance(3:end, 2:end-1) ...
        - luminance(2:end-1, 1:end-2) ...
        - luminance(2:end-1, 3:end);
    focus_metric = double(var(laplacian(:)));
else
    focus_metric = 0.0;
end

end
