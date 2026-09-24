#!/usr/bin/env bash
# test_512mb.sh — Build and test the E9 inference container under a 512 MB memory limit.
#
# Usage:
#   ./test_512mb.sh [path_to_test_image.jpg]
#
# Prerequisites:
#   - Docker Desktop must be running
#   - checkpoints/e9_full_referable_best.pt must exist
#
set -euo pipefail

IMAGE="sih26038-api:test"
CONTAINER="sih-mem-test"
PORT=8000
MEM_LIMIT="512m"
TEST_IMAGE="${1:-}"

echo "=== Step 1: Clean up any previous test container ==="
docker rm -f "$CONTAINER" 2>/dev/null || true

echo ""
echo "=== Step 2: Build Docker image ==="
docker build -t "$IMAGE" .

echo ""
echo "=== Step 3: Run with --memory=$MEM_LIMIT ==="
docker run -d --rm \
  --memory="$MEM_LIMIT" \
  -p "$PORT:8000" \
  -e INFERENCE_DEVICE=cpu \
  --name "$CONTAINER" \
  "$IMAGE"

echo ""
echo "=== Step 4: Wait for model to load (up to 180s) ==="
MAX_WAIT=180
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTH=$(curl -s "http://localhost:$PORT/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"model_loaded":true'; then
    echo ""
    echo "✅ Model loaded after ${ELAPSED}s"
    echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    break
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  printf "."
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo ""
  echo "❌ Model did not load within ${MAX_WAIT}s"
  echo "--- Container logs ---"
  docker logs "$CONTAINER" 2>&1 | tail -30
  docker rm -f "$CONTAINER" 2>/dev/null || true
  exit 1
fi

echo ""
echo "=== Step 5: Memory usage (post-load, before inference) ==="
docker stats "$CONTAINER" --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

if [ -n "$TEST_IMAGE" ]; then
  echo ""
  echo "=== Step 6: Test inference (Request 1) ==="
  RESPONSE=$(curl -s -X POST "http://localhost:$PORT/predict" \
    -F "image=@$TEST_IMAGE")
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE" | head -30
  echo "..."

  echo ""
  echo "=== Step 7: Memory usage (post-inference 1) ==="
  sleep 1
  docker stats "$CONTAINER" --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

  echo ""
  echo "=== Step 8: Test inference (Request 2 & 3 - stability check) ==="
  curl -s -o /dev/null -w "Request 2 HTTP Status: %{http_code}\n" -X POST "http://localhost:$PORT/predict" -F "image=@$TEST_IMAGE"
  curl -s -o /dev/null -w "Request 3 HTTP Status: %{http_code}\n" -X POST "http://localhost:$PORT/predict" -F "image=@$TEST_IMAGE"

  echo ""
  echo "=== Step 9: Memory usage (post-inference 3) ==="
  sleep 1
  docker stats "$CONTAINER" --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
else
  echo ""
  echo "⚠️  No test image provided. Skipping inference test."
  echo "   Re-run as: ./test_512mb.sh /path/to/fundus.jpg"
fi

echo ""
echo "=== Cleanup ==="
docker stop "$CONTAINER" 2>/dev/null || true
echo "Done."
