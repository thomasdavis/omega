# Content Index

This directory serves as a central index repository for metadata and uploaded files such as images, audio, and other content assets.

## Purpose

The content index folder is used to:
- Store metadata about uploaded files
- Maintain a searchable index of all content
- Serve as a central location for content management
- Track content versions and updates

## Usage

Files uploaded through the Discord bot are:
1. First saved to Railway storage (`/data/uploads` in production)
2. Immediately uploaded to GitHub (`file-library/` directory)
3. Automatically cleaned up from Railway after successful GitHub upload

The content index can be used to maintain local references, metadata, or additional information about files stored in the permanent GitHub storage.

## Structure

```
content/
├── index/          # This directory - central content index
│   ├── metadata/   # File metadata and indexes
│   └── README.md   # This file
└── blog/           # Blog posts
```

## Related Systems

- **GitHub Storage**: Permanent file storage at `file-library/` in the GitHub repository
- **Railway Storage**: Temporary storage at `/data/uploads` in production
- **File Upload Tool**: `apps/bot/src/agent/tools/fileUpload.ts`
- **Transfer Tool**: `apps/bot/src/agent/tools/transferRailwayFiles.ts`
