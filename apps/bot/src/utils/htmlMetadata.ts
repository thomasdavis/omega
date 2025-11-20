/**
 * HTML Metadata Extractor
 * Extracts metadata from HTML content including title, description, OpenGraph, Twitter Card, etc.
 */

export interface HtmlMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  charset?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitterCard?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
}

/**
 * Extract metadata from HTML content
 */
export function extractHtmlMetadata(html: string): HtmlMetadata {
  const metadata: HtmlMetadata = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Extract charset
  const charsetMatch = html.match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i);
  if (charsetMatch) {
    metadata.charset = charsetMatch[1].toLowerCase();
  }

  // Extract canonical URL
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    metadata.canonicalUrl = canonicalMatch[1];
  }

  // Extract meta description
  const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descriptionMatch) {
    metadata.description = decodeHtmlEntities(descriptionMatch[1].trim());
  }

  // Extract OpenGraph metadata
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDescriptionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  const ogTypeMatch = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
  const ogSiteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);

  if (ogTitleMatch || ogDescriptionMatch || ogImageMatch || ogUrlMatch || ogTypeMatch || ogSiteNameMatch) {
    metadata.openGraph = {
      title: ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : undefined,
      description: ogDescriptionMatch ? decodeHtmlEntities(ogDescriptionMatch[1].trim()) : undefined,
      image: ogImageMatch ? ogImageMatch[1] : undefined,
      url: ogUrlMatch ? ogUrlMatch[1] : undefined,
      type: ogTypeMatch ? ogTypeMatch[1] : undefined,
      siteName: ogSiteNameMatch ? decodeHtmlEntities(ogSiteNameMatch[1].trim()) : undefined,
    };
  }

  // Extract Twitter Card metadata
  const twitterCardMatch = html.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i);
  const twitterTitleMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  const twitterDescriptionMatch = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);
  const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const twitterSiteMatch = html.match(/<meta[^>]+name=["']twitter:site["'][^>]+content=["']([^"']+)["']/i);
  const twitterCreatorMatch = html.match(/<meta[^>]+name=["']twitter:creator["'][^>]+content=["']([^"']+)["']/i);

  if (twitterCardMatch || twitterTitleMatch || twitterDescriptionMatch || twitterImageMatch || twitterSiteMatch || twitterCreatorMatch) {
    metadata.twitterCard = {
      card: twitterCardMatch ? twitterCardMatch[1] : undefined,
      title: twitterTitleMatch ? decodeHtmlEntities(twitterTitleMatch[1].trim()) : undefined,
      description: twitterDescriptionMatch ? decodeHtmlEntities(twitterDescriptionMatch[1].trim()) : undefined,
      image: twitterImageMatch ? twitterImageMatch[1] : undefined,
      site: twitterSiteMatch ? twitterSiteMatch[1] : undefined,
      creator: twitterCreatorMatch ? twitterCreatorMatch[1] : undefined,
    };
  }

  return metadata;
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * Truncate metadata fields to prevent excessive length
 */
export function truncateMetadata(metadata: HtmlMetadata, maxLength = 500): HtmlMetadata {
  const truncate = (str: string | undefined) =>
    str && str.length > maxLength ? str.substring(0, maxLength) + '...' : str;

  return {
    ...metadata,
    title: truncate(metadata.title),
    description: truncate(metadata.description),
    openGraph: metadata.openGraph ? {
      ...metadata.openGraph,
      title: truncate(metadata.openGraph.title),
      description: truncate(metadata.openGraph.description),
    } : undefined,
    twitterCard: metadata.twitterCard ? {
      ...metadata.twitterCard,
      title: truncate(metadata.twitterCard.title),
      description: truncate(metadata.twitterCard.description),
    } : undefined,
  };
}
