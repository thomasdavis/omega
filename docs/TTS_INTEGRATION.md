# TTS (Text-to-Speech) Integration

> High-quality voice synthesis for blog posts and images using UncloseAI

## Overview

The TTS integration allows blog posts to provide audio descriptions for images and slide content. It uses UncloseAI's **Qwen3-TTS model** (1.7B parameters, 97ms first-packet latency) with 42+ cloned voices from the LibriSpeech corpus, supporting 10 languages. The default voice is `bm_fable`.

## Features

- ✅ On-demand TTS synthesis via `/api/tts` endpoint
- ✅ Smart caching system to avoid re-generating audio
- ✅ Rate limiting (20 requests/minute per IP)
- ✅ Accessible play buttons with keyboard support
- ✅ Support for 42+ voices from UncloseAI (Qwen3-TTS model)
- ✅ 10-language support with voice cloning capabilities
- ✅ Mobile-responsive design
- ✅ High contrast mode support
- ✅ Reduced motion support for accessibility

## TTS Model

The integration uses **Qwen3-TTS**, a state-of-the-art text-to-speech model with the following characteristics:

- **Parameters**: 1.7 billion parameters
- **Latency**: 97ms first-packet latency
- **Voices**: 42+ cloned voices from LibriSpeech corpus
- **Languages**: 10 language support with native pronunciation
- **Voice Cloning**: Can clone voices from 3-second audio samples
- **Quality**: High-fidelity, natural-sounding speech synthesis

The model parameter sent to the API is `tts-1`, which is OpenAI-compatible and maps to Qwen3-TTS on the UncloseAI endpoint.

## Architecture

### Components

1. **TTS Library** (`src/lib/tts.ts`)
   - Core TTS functionality
   - Request validation and sanitization
   - Caching mechanism using SHA-256 hashes
   - Integration with UncloseAI API

2. **API Endpoint** (`src/server/artifactServer.ts`)
   - POST `/api/tts` - Generate speech from text
   - Rate limiting (20 req/min)
   - Streaming audio responses
   - CORS support

3. **Blog Renderer** (`src/lib/blogRenderer.ts`)
   - Markdown parsing with frontmatter support
   - Automatic TTS button injection
   - HTML generation with embedded TTS player

4. **Frontend Player** (`public/tts-player.js` + `public/tts-player.css`)
   - Interactive play/pause buttons
   - Loading states and animations
   - Keyboard accessibility
   - Mobile-responsive styling

## Usage

### Creating TTS-Enabled Blog Posts

Create a markdown file in `/content/blog/` with TTS frontmatter:

```markdown
---
title: "My TTS-Enabled Post"
date: "2025-11-20"
tts: true
ttsVoice: "bm_fable"
---

# Welcome

![Beautiful sunset](https://example.com/sunset.jpg)
*Listen to this: A stunning view of the sun setting over the ocean*

The caption text will be read aloud when the play button is clicked.
```

### Frontmatter Options

- `tts` (boolean): Enable/disable TTS for the post (default: false)
- `ttsVoice` (string): Voice to use (default: "bm_fable")
- `title` (string): Post title
- `date` (string): Publication date (ISO format)

### Available Voices

The UncloseAI Qwen3-TTS API provides 42+ cloned voices from the LibriSpeech public domain corpus. Some popular options:

- `bm_fable` (recommended default) - Natural, clear voice
- `aria` - Female voice, versatile and balanced
- `atlas` - Male voice, warm and authoritative
- `alloy` - Versatile, balanced voice
- `echo` - Warm, expressive voice
- `shimmer` - Bright, energetic voice
- `onyx` - Deep, authoritative voice
- `nova` - Friendly, conversational voice

**Voice Cloning**: Qwen3-TTS supports cloning any voice from a 3-second audio sample.

See the full voice list at: https://speech.ai.unturf.com/v1/voices or https://uncloseai.com/text-to-speech.html

## API Endpoint

### POST /api/tts

Generate speech from text.

**Request:**
```json
{
  "text": "Text to synthesize",
  "voice": "bm_fable"
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Headers:
  - `X-TTS-Cached`: "true" or "false"
  - `X-TTS-Hash`: SHA-256 hash of text+voice
  - `Cache-Control`: "public, max-age=31536000"
- Body: MP3 audio data

**Rate Limiting:**
- 20 requests per minute per IP
- 429 status code when exceeded
- `retryAfter` field in error response

**Validation:**
- Maximum text length: 4096 characters
- Text is sanitized (removes `<>`, normalizes whitespace)
- Voice must be from allowed list

## Frontend Integration

### Automatic Initialization

The TTS player auto-initializes when included in a page:

```html
<script>
  window.ttsPlayerConfig = {
    voice: 'bm_fable',
    apiEndpoint: '/api/tts'
  };
</script>
<script src="/tts-player.js"></script>
<link rel="stylesheet" href="/tts-player.css">
```

### Manual Usage

```javascript
const player = new TTSPlayer({
  apiEndpoint: '/api/tts',
  voice: 'bm_fable'
});

player.init(); // Find and add play buttons to all [data-tts] elements
```

### Adding TTS to Custom Elements

```html
<img src="image.jpg" alt="Description" data-tts="This text will be read aloud">
```

Or skip auto-TTS on specific images:

```html
<img src="decorative.jpg" alt="" data-tts-skip>
```

## Caching System

### How It Works

1. Client requests TTS for text "Hello world" with voice "bm_fable"
2. Server computes hash: `sha256("Hello world:bm_fable")`
3. Server checks `/data/tts-cache/{hash}.mp3`
4. If exists → return cached file (instant)
5. If not → call UncloseAI API → cache result → return

### Storage Locations

- **Production (Railway):** `/data/tts-cache/`
- **Local development:** `apps/bot/data/tts-cache/`

### Cache Headers

Generated audio is cached aggressively:
- `Cache-Control: public, max-age=31536000` (1 year)
- Clients can cache audio indefinitely
- Content-addressed storage (hash-based filenames)

## Security

### Input Sanitization

- Maximum 4096 characters
- Removes HTML angle brackets (`<>`)
- Normalizes whitespace
- Prevents injection attacks

### Rate Limiting

- Simple in-memory rate limiter
- 20 requests per minute per IP
- Prevents API abuse
- Can be scaled with Redis/Upstash for production

### CORS Policy

- Allows cross-origin requests
- POST method enabled for API endpoint
- Suitable for embedded use

## Accessibility

### Keyboard Support

- Play buttons are fully keyboard accessible
- Focus indicators with high visibility
- Enter and Space keys trigger playback

### Screen Readers

- Proper ARIA labels on buttons
- Semantic HTML structure
- Alt text remains available

### Visual Accessibility

- High contrast mode support
- Reduced motion support (disables animations)
- Clear visual feedback for all states

### Mobile Accessibility

- Touch-friendly button sizes (48x48px)
- Responsive scaling
- Clear visual states

## Performance

### Caching Benefits

- First request: ~1-2 seconds (API call + synthesis)
- Subsequent requests: <100ms (cached file)
- No duplicate synthesis for identical text

### Optimizations

- Content-addressed storage (SHA-256)
- Streaming responses
- Browser-side caching (1 year)
- Efficient audio format (MP3)

## Legal & Licensing

### UncloseAI Terms

This integration uses UncloseAI's TTS API. Key points:

- **Privacy:** Minimal data collection, brief retention for rate limiting
- **Usage:** Must comply with acceptable use policy
- **Attribution:** AGPL license considerations for self-hosted deployment
- **Rate limits:** Enforced to prevent abuse

See full terms:
- Privacy Policy: https://unsandbox.com/privacy
- Terms of Service: https://unsandbox.com/terms

### Security Best Practices

⚠️ **Never send sensitive data to TTS services:**
- No API keys, passwords, tokens
- No personally identifiable information (PII)
- No proprietary/confidential content
- Only public-facing content suitable for audio

## Development

### Local Testing

```bash
# Start the server
pnpm dev

# Access blog
open http://localhost:3001/blog

# Test TTS endpoint
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"bm_fable"}' \
  > test.mp3

# Play the audio
mpg123 test.mp3
```

### Adding New Blog Posts

1. Create markdown file in `/content/blog/`
2. Add frontmatter with `tts: true`
3. Use proper alt text or caption format
4. Restart server (dev mode auto-reloads)
5. Visit http://localhost:3001/blog

### Debugging

Enable verbose logging:

```typescript
// In tts.ts
console.log('🎤 Generating TTS:', text);
console.log('📦 Cache hit:', hash);
```

Check cache directory:

```bash
ls -la apps/bot/data/tts-cache/
# or
ls -la /data/tts-cache/  # Production
```

## Production Deployment

### Environment Variables

No special environment variables required. TTS works out-of-the-box.

Optional configuration:
- Adjust `TTS_RATE_LIMIT` in `artifactServer.ts`
- Customize `TTS_RATE_WINDOW` for different time windows

### Scaling Considerations

For high-traffic deployments:

1. **Rate Limiting:**
   - Replace in-memory limiter with Redis/Upstash
   - Implement distributed rate limiting

2. **Caching:**
   - Consider CDN for audio files
   - Pre-generate audio for popular posts
   - Implement cache eviction policy

3. **API Fallback:**
   - Handle UncloseAI API outages gracefully
   - Show error messages to users
   - Queue failed requests for retry

### Pre-generation (Optional)

For frequently accessed content:

```bash
# Pre-generate TTS for all blog posts
node scripts/pregenerate-tts.js
```

This avoids first-request latency for users.

## Troubleshooting

### TTS Not Working

1. **Check console for errors:**
   ```javascript
   // Browser console
   // Look for CORS errors or 429 rate limits
   ```

2. **Verify endpoint is accessible:**
   ```bash
   curl -X POST http://localhost:3001/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"test"}'
   ```

3. **Check cache directory exists:**
   ```bash
   ls apps/bot/data/tts-cache/
   ```

### Rate Limit Errors

If you see 429 errors:
- Wait 1 minute for rate limit to reset
- Reduce request frequency
- Increase `TTS_RATE_LIMIT` if needed

### Audio Not Playing

1. Check browser console for errors
2. Verify audio format support (MP3)
3. Test with different browser
4. Check Content-Type header is `audio/mpeg`

## Future Enhancements

Potential improvements:

- [ ] Pre-generation script for popular posts
- [ ] Voice selection UI in blog posts
- [ ] Playback speed controls
- [ ] Download audio button
- [ ] Playlist mode for multiple images
- [ ] Alternative TTS providers
- [ ] WebVTT subtitle generation
- [ ] Language detection and multi-lingual support

## References

- UncloseAI TTS Docs: https://uncloseai.com/text-to-speech.html
- API Endpoint: https://speech.ai.unturf.com/v1/audio/speech
- Privacy Policy: https://unsandbox.com/privacy
- Terms of Service: https://unsandbox.com/terms

---

**Last Updated:** 2026-01-28
**Version:** 1.1.0 - Updated to Qwen3-TTS model with 42+ cloned voices
