# Docker deployment

This package runs the existing SIH-26038 FastAPI application in a CPU-safe
container. It is an engineering deployment check, not clinical validation;
Docker does not imply MATLAB or Simulink integration.

The frozen E9 checkpoint remains `checkpoints/e9_full_referable_best.pt`. It
is mounted read-only instead of copied into the image, avoiding a duplicate
339 MB artifact. The image does not download data or weights during its build.

## Prerequisites

- Docker with Docker Compose
- The local checkpoint at `checkpoints/e9_full_referable_best.pt`

## Start

From the project root:

```bash
docker compose up --build
```

The service is available at `http://localhost:8000`. Compose mounts the
checkpoint at `/models/e9_full_referable_best.pt` and supplies this location
through `MODEL_PATH`.

To run without Compose:

```bash
docker build -t sih26038-api:local .
docker run --rm -p 8000:8000 \
  -v "$(pwd)/checkpoints/e9_full_referable_best.pt:/models/e9_full_referable_best.pt:ro" \
  -e MODEL_PATH=/models/e9_full_referable_best.pt \
  sih26038-api:local
```

`MODEL_PATH` is optional outside Docker; when unset, the application uses the
project-relative default `checkpoints/e9_full_referable_best.pt`.

## Check the service

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict \
  -F "image=@data/aptos/aptos2019/train_images/000c1434d8d7.png"
```

`POST /predict` accepts `multipart/form-data` with the field named `image`.
The container chooses CUDA when available and otherwise CPU; Apple MPS is not
assumed in Docker. The local non-container runtime retains its existing MPS
selection behavior.

## Limitations

E9 is a frozen research checkpoint. Quality rejection is not clinically
validated, lesion evidence is experimental, and structure outputs marked
`not_implemented` remain unavailable. This deployment does not establish
clinical validity or performance in a real screening workflow.
