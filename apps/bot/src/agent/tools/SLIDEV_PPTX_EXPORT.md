# Slidev to PowerPoint Export Feature

## Overview

The `conversationToSlidev` tool now supports exporting Discord conversations directly to PowerPoint (.pptx) format, in addition to the existing Slidev markdown (.md) format.

## Features

✅ **Dual Format Export**: Generate both Slidev markdown and PowerPoint presentations
✅ **Lightweight Implementation**: Uses `pptxgenjs` library (no browser/Playwright overhead)
✅ **Professional Layouts**: Multiple slide layouts for different content types
✅ **Automatic Artifact Storage**: PPTX files saved alongside markdown artifacts
✅ **Shareable Download Links**: Direct download URLs for PowerPoint files

## Usage

### Basic Usage

The PPTX export is **enabled by default**. When you use the conversationToSlidev tool, it will automatically generate both formats:

```typescript
// The tool will generate:
// 1. Slidev markdown (.md) file
// 2. PowerPoint (.pptx) file
```

### Disable PPTX Export

If you only want the Slidev markdown:

```typescript
{
  exportToPptx: false
}
```

### Tool Parameters

```typescript
{
  limit: number,              // Number of messages (1-100, default: 20)
  theme: string,              // Slidev theme (default, seriph, apple-basic, shibainu)
  title: string,              // Presentation title
  groupByUser: boolean,       // Group consecutive messages by user
  messagesPerSlide: number,   // Messages per slide (1-10, default: 1)
  exportToPptx: boolean       // Also export as PPTX (default: true)
}
```

## Implementation Details

### Architecture

```
conversationToSlidev.ts
    ├── Generate Slidev Markdown
    ├── Save Markdown Artifact
    └── If exportToPptx = true:
        ├── Parse Markdown → pptxGenerator.ts
        ├── Generate PPTX Buffer
        └── Save PPTX Artifact
```

### PPTX Generation Flow

1. **Parsing**: `parseSlidevMarkdown()` converts markdown to structured slide data
2. **Layout Detection**: Automatically detects slide types (title, content, quote, end)
3. **Styling**: Applies professional PowerPoint formatting
4. **Export**: Generates binary PPTX file using pptxgenjs

### Supported Slide Layouts

| Slidev Layout | PowerPoint Layout | Description |
|--------------|------------------|-------------|
| Title slide | Centered large text | Opening slide with title and subtitle |
| Content slide | Title + body | Standard slide with heading and content |
| Quote layout | Compact text | Longer content with smaller font |
| End slide | Centered closing | Thank you / closing slide |

## File Structure

### Generated Artifacts

For each export, two artifacts are created:

```
/data/artifacts/
├── {uuid-1}.md          # Slidev markdown
├── {uuid-1}.json        # Markdown metadata
├── {uuid-2}.pptx        # PowerPoint file
└── {uuid-2}.json        # PPTX metadata
```

### Metadata Format

**Markdown Artifact:**
```json
{
  "id": "uuid-1",
  "type": "slidev",
  "title": "Discord Conversation",
  "description": "Slidev presentation with 20 messages from #channel",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "filename": "uuid-1.md"
}
```

**PPTX Artifact:**
```json
{
  "id": "uuid-2",
  "type": "pptx",
  "title": "Discord Conversation (PowerPoint)",
  "description": "PowerPoint export of Slidev presentation...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "filename": "uuid-2.pptx"
}
```

## API Response

### Success Response (with PPTX)

```json
{
  "success": true,
  "message": "Successfully converted 20 messages... PowerPoint (.pptx) version also available.",
  "slidevMarkdown": "...",
  "messageCount": 20,
  "slideCount": 15,
  "theme": "default",
  "exportDate": "2024-01-01T00:00:00.000Z",
  "artifactId": "uuid-1",
  "artifactUrl": "https://server/artifacts/uuid-1",
  "downloadUrl": "https://server/artifacts/uuid-1",
  "pptxAvailable": true,
  "pptxArtifactId": "uuid-2",
  "pptxUrl": "https://server/artifacts/uuid-2",
  "pptxDownloadUrl": "https://server/artifacts/uuid-2"
}
```

## Artifact Server

### PPTX Serving

The artifact server (`artifactServer.ts`) handles PPTX files with proper MIME types:

```typescript
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="Presentation_Title.pptx"
```

### Download Endpoints

- **Markdown**: `GET /artifacts/{uuid-1}` → Downloads .md file
- **PowerPoint**: `GET /artifacts/{uuid-2}` → Downloads .pptx file

## Error Handling

### Graceful Degradation

If PPTX generation fails:
- Error is logged but not thrown
- Markdown artifact is still saved
- Response indicates PPTX unavailable
- User receives markdown-only export

```typescript
try {
  // Generate PPTX
} catch (pptxError) {
  console.error('⚠️ Failed to generate PPTX:', pptxError);
  // Continue execution - PPTX is optional
}
```

## Dependencies

### Required Package

```json
{
  "dependencies": {
    "pptxgenjs": "^3.12.0"
  }
}
```

### Import

```typescript
import { generatePptxBuffer } from '../../utils/pptxGenerator.js';
```

## Utilities

### pptxGenerator.ts

**Main Functions:**

1. **`parseSlidevMarkdown(markdown: string): SlidevSlide[]`**
   - Parses Slidev markdown into structured slide data
   - Extracts layouts, titles, and content
   - Cleans markdown formatting for PowerPoint

2. **`generatePptxFromSlidev(markdown: string, options: PptxGeneratorOptions): PptxGenJS`**
   - Converts parsed slides to PowerPoint presentation
   - Applies layouts and styling
   - Returns PptxGenJS instance

3. **`generatePptxBuffer(markdown: string, options: PptxGeneratorOptions): Promise<Buffer>`**
   - Generates binary PPTX buffer
   - Ready for file writing
   - Used by conversationToSlidev tool

## Customization

### Slide Dimensions

Default: 16:9 widescreen (10" x 5.625")

```typescript
pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });
```

### Text Styling

Customize font sizes, colors, and positioning in `pptxGenerator.ts`:

```typescript
slide.addText(title, {
  fontSize: 36,      // Title font size
  bold: true,        // Bold text
  color: '363636',   // Dark gray
  align: 'center',   // Centered
});
```

## Testing

### Manual Testing

1. Use the conversationToSlidev tool in Discord
2. Download both .md and .pptx files
3. Verify PowerPoint opens correctly
4. Check slide layouts and content

### Verification Checklist

- ✅ Both .md and .pptx artifacts created
- ✅ Download links work correctly
- ✅ PowerPoint file opens in Microsoft PowerPoint / LibreOffice Impress
- ✅ Slides contain correct content
- ✅ Layouts are appropriate
- ✅ Text is readable and properly formatted

## Limitations

### Known Constraints

1. **No Slidev Themes**: PPTX uses standard PowerPoint styling (Slidev themes don't translate)
2. **HTML/Vue Components**: Custom Slidev components are not supported in PPTX
3. **Animations**: Slidev transitions don't convert to PowerPoint animations
4. **Code Highlighting**: Syntax highlighting is converted to plain text

### Workarounds

- Use Slidev markdown (.md) for web presentations with themes
- Use PowerPoint (.pptx) for offline sharing and editing
- Both formats are always available

## Future Enhancements

Potential improvements:

- [ ] Custom PowerPoint themes matching Slidev themes
- [ ] Code syntax highlighting in PPTX
- [ ] Image embedding from Discord messages
- [ ] Speaker notes from Slidev frontmatter
- [ ] Animation transitions
- [ ] PDF export option

## Troubleshooting

### PPTX Generation Fails

**Check:**
1. Is `pptxgenjs` installed? (`pnpm list pptxgenjs`)
2. Are there TypeScript errors in `pptxGenerator.ts`?
3. Is the markdown valid Slidev format?

### PPTX File Won't Open

**Possible causes:**
- Corrupted file during generation
- Invalid slide content
- Missing required PPTX structure

**Solution:**
- Check server logs for PPTX generation errors
- Verify artifact file size is non-zero
- Try regenerating with different content

### Incorrect Content in Slides

**Common issues:**
- Markdown parsing not extracting content correctly
- HTML tags not being filtered
- Layout detection choosing wrong template

**Solution:**
- Review `parseSlidevMarkdown()` function
- Check slide layout detection logic
- Adjust regex patterns for content extraction

## References

- **pptxgenjs Documentation**: https://gitbrent.github.io/PptxGenJS/
- **Slidev Documentation**: https://sli.dev/
- **PAM Specification**: https://jsonagents.org/

## Changelog

### v1.0.0 (2024-11-20)
- Initial implementation of PPTX export
- Support for multiple slide layouts
- Automatic artifact storage
- Graceful error handling
- Default enabled for all exports
