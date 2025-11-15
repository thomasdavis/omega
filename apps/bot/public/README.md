# Public Files Directory

This directory contains files that are publicly accessible via the artifact preview server.

## Structure

- `/uploads/` - User-uploaded files via the fileUpload tool

## File Upload Tool

The fileUpload tool allows users to upload files via Discord and get shareable links.

### Features

- **File Type Validation**: Whitelist of allowed extensions for security
- **Size Limits**: Maximum 25MB (Discord's attachment limit)
- **Security**: Filename sanitization to prevent directory traversal and other attacks
- **Unique Filenames**: UUID-based naming to prevent collisions
- **Metadata Storage**: JSON metadata files for each upload

### Supported File Types

- **Images**: jpg, jpeg, png, gif, webp, svg, bmp, ico
- **Documents**: pdf, txt, md, doc, docx, odt
- **Data**: json, xml, csv, yaml, yml
- **Archives**: zip, tar, gz, 7z
- **Code**: js, ts, py, java, cpp, c, rs, go, rb, php, html, css, scss, sass
- **Media**: mp3, mp4, wav, ogg, webm
- **Other**: log, sql, sh, bat

### Access

Uploaded files are accessible at: `http://localhost:3001/uploads/:filename`

In production: `https://your-domain.com/uploads/:filename`

## Security Considerations

1. **Whitelist Approach**: Only explicitly allowed file extensions are accepted
2. **Filename Sanitization**: All special characters are replaced with underscores
3. **Directory Traversal Prevention**: Path components are stripped from filenames
4. **Size Limits**: Files exceeding 25MB are rejected
5. **Metadata Validation**: File metadata is validated before storage

## Usage

When a user shares a file in Discord, the bot can:
1. Extract the attachment URL
2. Download the file content
3. Encode it to base64
4. Use the fileUpload tool to save it
5. Return a shareable URL to the user

Note: The tool requires base64-encoded file data, so Discord attachments must be downloaded and encoded first.
