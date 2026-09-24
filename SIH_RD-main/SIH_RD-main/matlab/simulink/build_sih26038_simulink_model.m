function build_sih26038_simulink_model()
%BUILD_SIH26038_SIMULINK_MODEL Programmatically build/save sih26038_pipeline.slx.
%
%   build_sih26038_simulink_model()
%
% Constructs a system-level Simulink model representing the SIH-26038 telemedicine
% screening workflow around the Python E9 AI system.
%
% Note: The "Python E9 Inference Interface" block is an abstract system interface
%       representing Python FastAPI POST /predict; it does NOT execute PyTorch
%       weights natively inside Simulink.

model_name = 'sih26038_pipeline';

if bdIsLoaded(model_name)
    close_system(model_name, 0);
end

new_system(model_name);
open_system(model_name);

% Set model description
set_param(model_name, 'Description', 'SIH-26038 Telemedicine System Deployment Simulation');

% Add Subsystem blocks for the 10 required architecture components
subsystems = { ...
    'Image Acquisition', [50, 50, 200, 100]; ...
    'Network Upload', [250, 50, 400, 100]; ...
    'MATLAB Quality Processing', [450, 50, 600, 100]; ...
    'Python E9 Inference Interface', [650, 50, 800, 100]; ...
    'DR Decision', [50, 200, 200, 250]; ...
    'Calibration & Uncertainty', [250, 200, 400, 250]; ...
    'Evidence Reliability Gate', [450, 200, 600, 250]; ...
    'Human Review Queue', [650, 200, 800, 250]; ...
    'Screening Report', [250, 350, 400, 400]; ...
    'Deployment Metrics', [450, 350, 650, 400] ...
};

for i = 1:size(subsystems, 1)
    blk_name = [model_name '/' subsystems{i, 1}];
    add_block('built-in/Subsystem', blk_name, 'Position', subsystems{i, 2});
end

% Set parameters/annotations on key subsystems
set_param([model_name '/Python E9 Inference Interface'], 'Description', 'Abstract system interface to Python FastAPI POST /predict (E9 model)');
set_param([model_name '/Deployment Metrics'], 'Description', 'Capacity Simulation Scenario (100,000+ patients/year)');

% Save model to matlab/simulink/sih26038_pipeline.slx
slx_path = fullfile(fileparts(mfilename('fullpath')), 'sih26038_pipeline.slx');
save_system(model_name, slx_path);
fprintf('Successfully built and saved Simulink model: %s\n', slx_path);

end
