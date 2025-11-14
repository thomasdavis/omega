# Web Scraping with Robots.txt Compliance

Omega's web fetch tool automatically respects robots.txt rules before scraping any website. This ensures ethical web scraping practices and compliance with website policies.

## Features

### Robots.txt Checker (`src/utils/robotsChecker.ts`)

- **Automatic Compliance**: Checks robots.txt before every web fetch
- **RFC 9309 Compliant**: Follows the latest robots.txt specification
- **Caching**: Caches robots.txt rules for 1 hour to reduce requests
- **User-Agent Support**: Respects user-agent specific rules
- **Pattern Matching**: Supports wildcards and path patterns
- **Permissive Fallback**: Allows access if robots.txt is unavailable

### Web Fetch Tool (`src/agent/tools/webFetch.ts`)

- **Pre-fetch Validation**: Checks robots.txt before fetching content
- **HTML Extraction**: Extracts clean text from HTML pages
- **Content Limiting**: Prevents token overflow with configurable max length
- **Error Handling**: Provides detailed error messages for debugging
- **Content Type Detection**: Only processes HTML and plain text

## Usage

The web fetch tool is automatically available to the AI agent. Users can ask questions that require web content:

```
User: What's on the homepage of example.com?
Bot: *uses webFetch tool to fetch and analyze the page*
```

## How It Works

1. **User asks for web content**
2. **Agent calls webFetch tool** with the URL
3. **Robots.txt check**:
   - Fetches robots.txt from the domain (cached for 1 hour)
   - Parses rules for user-agent "OmegaBot"
   - Checks if the specific path is allowed
4. **If allowed**:
   - Fetches the page with proper user-agent header
   - Extracts text content from HTML
   - Returns content to the agent
5. **If blocked**:
   - Returns error message explaining the robots.txt restriction
   - Agent informs the user

## Robots.txt Parsing

The implementation follows RFC 9309 and supports:

- **User-agent directives**: `User-agent: *` or `User-agent: OmegaBot`
- **Disallow rules**: `Disallow: /private/`
- **Allow rules**: `Allow: /public/` (overrides disallow)
- **Wildcards**: `Disallow: /temp*.html`
- **End of path**: `Disallow: /page$` (exact match)

### Example robots.txt

```
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/

User-agent: OmegaBot
Disallow: /temp/
Allow: /api/docs/
```

In this example:
- All bots are blocked from `/admin/` and `/private/`
- All bots can access `/public/`
- OmegaBot is additionally blocked from `/temp/`
- OmegaBot can access `/api/docs/` even if another rule blocks it

## Best Practices

1. **Always use webFetch tool** instead of making raw HTTP requests
2. **Respect robots.txt** - the tool enforces this automatically
3. **Set appropriate maxLength** to avoid token overflow (default 5000 chars)
4. **Inform users** when a site blocks scraping
5. **Suggest alternatives** like official APIs or documentation

## Error Handling

The tool provides detailed error responses:

- **Robots.txt blocked**: `{ success: false, error: 'Robots.txt check failed', reason: '...' }`
- **HTTP errors**: `{ success: false, error: 'HTTP error', statusCode: 404, ... }`
- **Unsupported content**: `{ success: false, error: 'Unsupported content type', ... }`
- **Timeout/Network**: `{ success: false, error: 'TimeoutError', message: '...' }`

## Technical Details

### User-Agent

All requests use the user-agent:
```
OmegaBot/1.0 (Discord Bot; +https://github.com/thomasdavis/omega)
```

### Caching

- Robots.txt rules are cached for 1 hour per domain
- Reduces unnecessary requests to robots.txt
- Cache is in-memory (resets on bot restart)

### Timeout

- Web fetch has a 10-second timeout
- Prevents hanging on slow websites

### Content Extraction

- Removes `<script>` and `<style>` tags
- Strips HTML tags
- Decodes common HTML entities
- Normalizes whitespace
- Truncates to maxLength

## Testing

To test the implementation:

```typescript
import { canScrapeUrl } from './utils/robotsChecker.js';

// Test robots.txt checking
const result = await canScrapeUrl('https://example.com/page');
console.log(result.allowed); // true or false
```

## Future Enhancements

Potential improvements:

1. **HTML Parser**: Use a proper HTML parser (cheerio, linkedom) for better extraction
2. **Persistent Cache**: Store robots.txt in Redis/database
3. **Sitemap Support**: Parse sitemap.xml for better crawling
4. **Rate Limiting**: Implement per-domain rate limits
5. **Respect Crawl-Delay**: Honor crawl-delay directive from robots.txt
6. **Meta Robots**: Check `<meta name="robots">` tags
7. **JavaScript Rendering**: Use headless browser for JS-heavy sites

## References

- [RFC 9309 - Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Google's robots.txt specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
