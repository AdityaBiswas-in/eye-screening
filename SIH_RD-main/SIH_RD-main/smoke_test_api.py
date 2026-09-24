import json

from fastapi.testclient import TestClient

from app.main import app


IMAGE_PATH = "data/aptos/aptos2019/train_images/46923eea9a4e.png"


with TestClient(app) as client:
    with open(IMAGE_PATH, "rb") as f:
        response = client.post(
            "/predict",
            files={
                "image": (
                    "46923eea9a4e.png",
                    f,
                    "image/png",
                )
            },
        )

    print("STATUS:", response.status_code)
    print(json.dumps(response.json(), indent=2))
