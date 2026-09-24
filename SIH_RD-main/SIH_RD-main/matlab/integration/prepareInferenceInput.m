function [img_resized, metadata] = prepareInferenceInput(img, target_size)
%PREPAREINFERENCEINPUT Format MATLAB processed image for Python E9 inference.
%
%   [img_resized, metadata] = prepareInferenceInput(img, target_size)
%
% Inputs:
%   img         - uint8 RGB image array
%   target_size - optional target square dimension (default: 384)
%
% Outputs:
%   img_resized - uint8 RGB image resized to [target_size x target_size x 3]
%   metadata    - struct containing shape and tensor layout metadata

if nargin < 2 || isempty(target_size)
    target_size = 384;
end

if ischar(img) || isstring(img)
    img = imread(img);
end

[orig_H, orig_W, C] = size(img);

if C == 1
    rgb = cat(3, img, img, img);
else
    rgb = img;
end

if orig_H ~= target_size || orig_W ~= target_size
    img_resized = imresize(rgb, [target_size target_size]);
else
    img_resized = rgb;
end

metadata = struct();
metadata.original_height = orig_H;
metadata.original_width = orig_W;
metadata.target_height = target_size;
metadata.target_width = target_size;
metadata.color_space = 'RGB';
metadata.tensor_layout = 'NCHW float32 (1 x 3 x 384 x 384)';
metadata.imagenet_normalized = true;

end
