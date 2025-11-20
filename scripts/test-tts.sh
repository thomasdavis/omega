#!/bin/bash

# Test TTS Integration
# This script demonstrates the TTS API endpoint

set -e

echo "🎤 Testing TTS API"
echo ""

# Check if server is running
echo "📡 Checking if server is running..."
if ! curl -s http://localhost:3001/health > /dev/null; then
  echo "❌ Server is not running at http://localhost:3001"
  echo "   Start the server with: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test TTS endpoint
echo "🎙️  Testing TTS synthesis..."
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from the TTS integration test","voice":"bm_fable"}' \
  -o test-tts-output.mp3)

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo "✅ TTS API responded successfully (HTTP 200)"
  echo "   Audio saved to: test-tts-output.mp3"
  echo ""
  echo "📊 File info:"
  ls -lh test-tts-output.mp3
  echo ""
  echo "🎵 To play the audio:"
  echo "   mpg123 test-tts-output.mp3"
  echo "   # or"
  echo "   open test-tts-output.mp3  # macOS"
  echo "   # or"
  echo "   xdg-open test-tts-output.mp3  # Linux"
else
  echo "❌ TTS API failed (HTTP $http_code)"
  cat test-tts-output.mp3
  exit 1
fi

echo ""
echo "🌐 Available endpoints:"
echo "   Blog Index:  http://localhost:3001/blog"
echo "   Example Post: http://localhost:3001/blog/example-post"
echo "   TTS API:     http://localhost:3001/api/tts"
echo ""
echo "✅ All tests passed!"
