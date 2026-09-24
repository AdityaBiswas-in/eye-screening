function enhanced_img = applyCLAHE(img)
%APPLYCLAHE Apply luminance-only Contrast-Limited Adaptive Histogram Equalization.
%
%   enhanced_img = applyCLAHE(img)
%
% Inputs:
%   img - uint8 RGB image array [H x W x 3]
%
% Outputs:
%   enhanced_img - uint8 RGB enhanced image array
%
% Note: CLAHE is an optional enhancement stage that modifies local contrast.

if ischar(img) || isstring(img)
    img = imread(img);
end

enhanced_img = img;

if exist('rgb2lab', 'file') && exist('lab2rgb', 'file') && exist('adapthisteq', 'file')
    lab = rgb2lab(img);
    l_norm = lab(:,:,1) / 100.0;
    l_clahe = adapthisteq(l_norm, 'ClipLimit', 0.02, 'NumTiles', [8 8]);
    lab(:,:,1) = l_clahe * 100.0;
    enhanced_img = uint8(lab2rgb(lab) * 255.0);
end

end
