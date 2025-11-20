#!/bin/bash
# Test script to discover Unsandbox API endpoints
# Based on issue #151 requirements

API_KEY="open-says-me"
BASE_URL="https://api.unsandbox.com"

echo "=== Unsandbox API Endpoint Discovery ==="
echo ""

# Test 1: Health endpoint
echo "1. Testing /health endpoint..."
curl -s "${BASE_URL}/health" | head -c 200
echo -e "\n"

# Test 2: Execute endpoint (async)
echo "2. Testing /v1/execute endpoint (async)..."
curl -s -X POST "${BASE_URL}/v1/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")",
    "ttl": 5
  }' | head -c 500
echo -e "\n"

# Test 3: Execute endpoint (sync) - if it exists
echo "3. Testing /v1/execute/sync endpoint (if exists)..."
curl -s -X POST "${BASE_URL}/v1/execute/sync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Test\")",
    "ttl": 5
  }' | head -c 500
echo -e "\n"

# Test 4: Compile endpoint - if it exists
echo "4. Testing /v1/compile endpoint (if exists)..."
curl -s -X POST "${BASE_URL}/v1/compile" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nint main() { std::cout << \"Hello\"; return 0; }"
  }' | head -c 500
echo -e "\n"

# Test 5: OpenAPI spec
echo "5. Fetching OpenAPI specification..."
curl -s "${BASE_URL}/openapi" | head -c 1000
echo -e "\n"

echo "=== Test Complete ==="
