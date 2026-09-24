function denoised_img = denoiseFundus(img)
%DENOISEFUNDUS Apply conservative 3x3 median filtering to fundus images.
%
%   denoised_img = denoiseFundus(img)
%
% Inputs:
%   img - uint8 RGB or grayscale image array
%
% Outputs:
%   denoised_img - uint8 RGB or grayscale denoised image array
%
% Note: Filtering is conservative (3x3 median) to avoid erasing fine lesions.

if ischar(img) || isstring(img)
    img = imread(img);
end

denoised_img = img;

if size(img, 3) == 3
    for c = 1:3
        denoised_img(:,:,c) = medfilt2(img(:,:,c), [3 3]);
    end
else
    denoised_img = medfilt2(img, [3 3]);
end

end
