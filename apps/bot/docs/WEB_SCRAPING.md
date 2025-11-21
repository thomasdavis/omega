# Web Scraping with robots.txt Compliance

## Overview

Omega includes ethical web scraping capabilities through the `webFetch` tool, which automatically checks and respects `robots.txt` rules before fetching any web page content.

## Features

### 🤖 Automatic robots.txt Checking
- Fetches and parses `robots.txt` before accessing any page
- Respects User-agent specific rules
- Handles wildcards and pattern matching
- Falls back to allowing access if `robots.txt` is unavailable (standard practice)

### 🔄 Intelligent Caching
- Caches robots.txt rules for 1 hour to reduce redundant requests
- Improves performance for repeated access to the same domain

### ✅ Rule Compliance
- Supports `Allow` and `Disallow` directives
- `Allow` rules take precedence over `Disallow` (per RFC standard)
- Pattern matching with wildcards (`*`) and end-of-line markers (`$`)
- User-agent specific rules and wildcard (`*`) fallback

### 🔍 Dual Mode Support
- **Parsed Mode** (default): Strips HTML tags, extracts text content, limits to 5000 characters for AI processing
- **Raw Mode**: Returns unmodified HTML source for debugging, validation, linting, or local proxying

## Usage

### In Discord

Users can ask Omega to fetch web page content naturally:

```
@omega Can you fetch the content from https://example.com/page
@omega What does https://example.com/article say about X?
```

The AI will automatically use the `webFetch` tool, which will:
1. Check robots.txt compliance
2. Fetch the page if allowed
3. Return an error message if disallowed by robots.txt

### Programmatic Usage

```typescript
import { webFetchTool } from './agent/tools/webFetch.js';

// Parsed mode (default) - extracts text content
const parsedResult = await webFetchTool.execute({
  url: 'https://example.com/page',
  userAgent: 'OmegaBot/1.0',
  mode: 'parsed' // or omit (defaults to 'parsed')
});

// Raw mode - returns unmodified HTML
const rawResult = await webFetchTool.execute({
  url: 'https://example.com/page',
  userAgent: 'OmegaBot/1.0',
  mode: 'raw'
});
```

### Direct robots.txt Checking

```typescript
import { robotsChecker } from './utils/robotsChecker.js';

// Check if a URL is allowed
const result = await robotsChecker.isAllowed(
  'https://example.com/page',
  'OmegaBot/1.0'
);

if (result.allowed) {
  // Safe to fetch
  console.log('URL is allowed:', result.reason);
} else {
  // Respect the robots.txt rules
  console.log('URL is disallowed:', result.reason);
}
```

## How It Works

### 1. robots.txt Parsing

When a URL is requested:
1. Extract the domain from the URL
2. Fetch `https://domain.com/robots.txt`
3. Parse the file for relevant User-agent rules
4. Cache the rules for future requests

### 2. Rule Matching

The checker looks for:
- **User-agent specific rules** (e.g., `User-agent: OmegaBot`)
- **Wildcard rules** (e.g., `User-agent: *`)
- **Disallow directives** - Paths that should not be accessed
- **Allow directives** - Explicit exceptions to Disallow rules

### 3. Path Matching

Supports various pattern types:
```
Disallow: /admin/           # Blocks /admin/ and all subpaths
Disallow: /private/*.html   # Blocks HTML files in /private/
Disallow: /temp$            # Blocks exactly /temp (not /temp/page)
Allow: /public/             # Allows /public/ even if parent is blocked
```

## Example robots.txt

```
# Allow everyone
User-agent: *
Disallow:

# Block specific bot from everything
User-agent: BadBot
Disallow: /

# Allow specific bot with restrictions
User-agent: OmegaBot
Disallow: /private/
Disallow: /admin/
Allow: /public/
```

## Response Format

### Success Response (Parsed Mode)

```javascript
{
  success: true,
  url: "https://example.com/page",
  content: "Page content here...",
  contentType: "text/html",
  contentLength: 1234,
  robotsCompliant: true,
  mode: "parsed",
  message: "Successfully fetched page content while respecting robots.txt rules."
}
```

### Success Response (Raw Mode)

```javascript
{
  success: true,
  url: "https://example.com/page",
  content: "<!DOCTYPE html><html>...</html>",
  contentType: "text/html",
  contentLength: 12345,
  robotsCompliant: true,
  mode: "raw",
  message: "Successfully fetched raw HTML content while respecting robots.txt rules. Use this for debugging, validation, or local proxying."
}
```

### Blocked by robots.txt

```javascript
{
  success: false,
  error: "robots_txt_disallowed",
  message: "This URL is disallowed by the website's robots.txt file...",
  url: "https://example.com/blocked",
  robotsUrl: "https://example.com/robots.txt",
  reason: "URL is disallowed by robots.txt rules"
}
```

### Fetch Error

```javascript
{
  success: false,
  error: "fetch_failed",
  message: "Failed to fetch URL: 404 Not Found",
  url: "https://example.com/missing",
  statusCode: 404
}
```

## Configuration

### User Agent

The default user agent is `OmegaBot/1.0`. To customize:

```typescript
const result = await robotsChecker.isAllowed(
  url,
  'YourBot/2.0'  // Custom user agent
);
```

### Cache Management

Clear the robots.txt cache if needed:

```typescript
import { robotsChecker } from './utils/robotsChecker.js';

robotsChecker.clearCache();
```

## Best Practices

### ✅ Do's
- Always use the `webFetch` tool for web scraping
- Respect robots.txt disallow rules
- Use a descriptive User-agent identifier
- Implement reasonable rate limiting
- Cache responses when appropriate

### ❌ Don'ts
- Don't bypass robots.txt checking
- Don't scrape disallowed paths
- Don't use misleading User-agent strings
- Don't make excessive requests to the same domain
- Don't ignore HTTP error codes

## Technical Details

### Dependencies
- Native `fetch` API (Node.js 18+)
- No external parsing libraries required
- Uses `AbortSignal.timeout()` for request timeouts

### Timeouts
- robots.txt fetch: 5 seconds
- Page content fetch: 10 seconds

### Content Limitations
- **Parsed mode**: Maximum 5000 characters (truncated with a note)
- **Raw mode**: No truncation - returns complete HTML source
- Parsed mode prevents token overflow in AI responses

### Security
- **Parsed mode**: HTML script and style tags are stripped for safety
- **Raw mode**: Preserves all HTML including scripts/styles for debugging
- No code execution from fetched content
- Request timeouts prevent hanging requests

## Related Files

- `/apps/bot/src/utils/robotsChecker.ts` - Core robots.txt checking logic
- `/apps/bot/src/agent/tools/webFetch.ts` - Web fetch tool implementation
- `/apps/bot/src/agent/agent.ts` - Agent configuration with tools

## Standards Compliance

This implementation follows:
- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) - Robots Exclusion Protocol
- Standard robots.txt parsing rules
- Fail-open approach (allow if robots.txt is unavailable)

## Use Cases

### Parsed Mode (Default)
- Natural language AI conversations about web content
- Extracting text information for analysis
- Summarizing web pages
- Answering questions based on web content

### Raw Mode
- **HTML Validation**: Run HTML through validators or linters
- **Debugging**: Inspect exact HTML structure including all tags and attributes
- **Local Proxying**: Save HTML locally for testing or development
- **Automated Testing**: Verify HTML structure in CI/CD pipelines
- **Accessibility Audits**: Analyze complete HTML for accessibility issues
- **SEO Analysis**: Inspect meta tags, structured data, and other SEO elements

## Future Enhancements

Potential improvements:
- [ ] Support for `Crawl-delay` directive
- [ ] Sitemap parsing integration
- [ ] More sophisticated HTML parsing (extract metadata, structured data)
- [ ] Support for `meta robots` tags in HTML
- [ ] Rate limiting per domain
- [ ] Respect `X-Robots-Tag` HTTP headers

## Testing

To test robots.txt compliance:

```typescript
// Test with a known URL
const result = await robotsChecker.isAllowed(
  'https://www.google.com/search',
  'OmegaBot'
);

console.log('Allowed:', result.allowed);
console.log('Reason:', result.reason);
```

## Troubleshooting

### robots.txt Not Found
If robots.txt returns 404, the URL is allowed (standard behavior).

### Timeout Errors
Increase timeout values in `robotsChecker.ts` and `webFetch.ts` if needed.

### Parse Errors
Check that the robots.txt file is properly formatted. Malformed files may result in unexpected behavior.

### Cache Issues
Clear the cache with `robotsChecker.clearCache()` if rules seem stale.

---

**Remember:** Respecting robots.txt is not just about following rules—it's about being a good citizen of the web. Always practice ethical web scraping.
