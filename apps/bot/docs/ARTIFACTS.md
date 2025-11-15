# Artifact Generation and Preview System

The bot includes a powerful artifact generation system that allows you to create interactive web content with shareable preview links.

## Features

- **Generate HTML Pages**: Create interactive web pages with custom CSS and JavaScript
- **SVG Graphics**: Generate scalable vector graphics for diagrams, charts, and illustrations
- **Markdown Documents**: Create formatted markdown documents with HTML preview
- **Shareable Links**: Each artifact gets a unique URL that can be shared and accessed
- **Gallery View**: Browse all created artifacts at the server root URL

## How to Use

### In Discord

Ask the bot to create an artifact:

```
@bot create an interactive HTML page showing a bouncing ball animation
```

```
@bot generate an SVG diagram of a simple flowchart
```

```
@bot make a markdown document explaining recursion
```

The bot will use the `artifact` tool to generate the content and provide you with a preview link.

### Artifact Types

#### HTML Artifacts
- Full HTML pages with custom styling and interactivity
- Include CSS for styling
- Add JavaScript for dynamic behavior
- Perfect for: demos, interactive visualizations, mini-apps

Example:
```
Create an HTML artifact with a gradient background and animated text
```

#### SVG Artifacts
- Scalable vector graphics
- Customizable width and height
- Perfect for: diagrams, charts, logos, illustrations

Example:
```
Generate an SVG of a simple bar chart showing sales data
```

#### Markdown Artifacts
- Formatted text documents
- Rendered as HTML for preview
- Perfect for: documentation, tutorials, formatted notes

Example:
```
Create a markdown guide explaining the artifact system
```

## Server Configuration

### Environment Variables

```env
# Port for the artifact preview server (default: 3001)
ARTIFACT_SERVER_PORT=3001

# Public URL for artifact previews
# In production, set this to your public domain/IP
ARTIFACT_SERVER_URL=http://localhost:3001
```

### Server Endpoints

- `GET /` - Gallery view of all artifacts
- `GET /artifacts/:id` - View a specific artifact by UUID
- `GET /health` - Health check endpoint

### Running the Server

The artifact server starts automatically when the bot starts. It runs on port 3001 by default (configurable via `ARTIFACT_SERVER_PORT`).

## Production Deployment

When deploying to production:

1. **Set ARTIFACT_SERVER_URL**: Update the environment variable to your public URL
   ```env
   ARTIFACT_SERVER_URL=https://your-domain.com
   ```

2. **Configure Reverse Proxy** (optional): Use nginx or similar to proxy requests
   ```nginx
   location /artifacts {
       proxy_pass http://localhost:3001/artifacts;
   }
   ```

3. **Use HTTPS**: Ensure your server has SSL/TLS configured for secure artifact sharing

4. **Persistent Storage**: Consider using a database or cloud storage for artifacts instead of filesystem

## Security Considerations

- Artifact IDs are UUIDs to prevent enumeration
- CORS is enabled for embedding
- User-generated content is escaped to prevent XSS
- Artifacts are stored in a separate directory (`artifacts/`)
- The artifacts directory is excluded from git (in `.gitignore`)

## File Structure

```
apps/bot/
├── artifacts/              # Generated artifacts (not in git)
│   ├── {uuid}.html        # HTML artifacts
│   ├── {uuid}.svg         # SVG artifacts
│   └── {uuid}.json        # Artifact metadata
├── src/
│   ├── agent/
│   │   └── tools/
│   │       └── artifact.ts # Artifact generation tool
│   └── server/
│       └── artifactServer.ts # HTTP server for previews
```

## Limitations

- File-based storage (not suitable for high traffic)
- No authentication or access control
- Artifacts persist until manually deleted
- Storage is limited by disk space

## Future Enhancements

Potential improvements for the artifact system:

- [ ] Database storage for artifacts
- [ ] User authentication and private artifacts
- [ ] Artifact expiration/TTL
- [ ] Image/screenshot generation for previews
- [ ] Search and filtering in gallery
- [ ] Artifact editing and versioning
- [ ] Embed code generation for websites
- [ ] Cloud storage integration (S3, etc.)
- [ ] CDN integration for better performance
