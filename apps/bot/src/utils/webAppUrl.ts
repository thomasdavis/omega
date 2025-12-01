/**
 * Web App URL Configuration
 *
 * The Next.js web app (omega-web) serves all static files including:
 * - Artifacts (HTML/SVG/Markdown)
 * - Uploads (user files)
 * - Documents (collaborative docs)
 * - Blog posts
 *
 * This replaces the old artifact server that was embedded in the bot.
 */

/**
 * Get the web app base URL from environment variables
 *
 * Priority:
 * 1. WEB_APP_URL - New variable for Next.js web app
 * 2. ARTIFACT_SERVER_URL - Legacy variable (still works for backwards compatibility)
 * 3. Auto-detect from Railway environment
 * 4. Fallback to localhost:3000
 */
export function getWebAppUrl(): string {
  // Check new variable first
  if (process.env.WEB_APP_URL) {
    return process.env.WEB_APP_URL.replace(/\/$/, ''); // Remove trailing slash
  }

  // Backwards compatibility with old variable name
  if (process.env.ARTIFACT_SERVER_URL) {
    return process.env.ARTIFACT_SERVER_URL.replace(/\/$/, '');
  }

  // Auto-detect Railway deployment
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    // User should set WEB_APP_URL explicitly, but provide helpful error
    console.warn(
      '⚠️  WEB_APP_URL not set in Railway production environment. ' +
      'Please set WEB_APP_URL to your omega-web service URL.'
    );
  }

  // Development fallback
  return 'http://localhost:3000';
}

/**
 * Get full URL for an artifact
 * @param filename - The artifact filename (e.g., "abc-123.html")
 */
export function getArtifactUrl(filename: string): string {
  return `${getWebAppUrl()}/api/artifacts/${filename}`;
}

/**
 * Get full URL for an uploaded file
 * @param filename - The upload filename
 */
export function getUploadUrl(filename: string): string {
  return `${getWebAppUrl()}/api/uploads/${filename}`;
}

/**
 * Get full URL for a document
 * @param documentId - The document ID
 */
export function getDocumentUrl(documentId: string): string {
  return `${getWebAppUrl()}/api/documents/${documentId}`;
}

/**
 * Get full URL for a blog post
 * @param slug - The blog post slug
 */
export function getBlogPostUrl(slug: string): string {
  return `${getWebAppUrl()}/api/blog/${slug}`;
}
