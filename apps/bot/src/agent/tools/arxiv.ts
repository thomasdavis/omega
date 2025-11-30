/**
 * arXiv API Tool - Query academic papers from arXiv.org
 * Supports searching by keywords, authors, categories, and date ranges
 * API Documentation: https://info.arxiv.org/help/api/basics.html
 */

import { tool } from 'ai';
import { z } from 'zod';

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  pdfUrl?: string;
  arxivUrl: string;
  primaryCategory?: string;
}

/**
 * Parse arXiv Atom XML response to extract paper entries
 */
function parseArxivXml(xmlText: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];

  // Split by <entry> tags
  const entryMatches = xmlText.match(/<entry>([\s\S]*?)<\/entry>/g);

  if (!entryMatches) {
    return entries;
  }

  for (const entryXml of entryMatches) {
    try {
      // Extract ID (arXiv URL)
      const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
      const id = idMatch ? idMatch[1].trim() : '';

      // Extract title
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

      // Extract summary
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '';

      // Extract authors
      const authorMatches = entryXml.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g);
      const authors: string[] = [];
      if (authorMatches) {
        for (const authorMatch of authorMatches) {
          const nameMatch = authorMatch.match(/<name>(.*?)<\/name>/);
          if (nameMatch) {
            authors.push(nameMatch[1].trim());
          }
        }
      }

      // Extract published date
      const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
      const published = publishedMatch ? publishedMatch[1].trim() : '';

      // Extract updated date
      const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/);
      const updated = updatedMatch ? updatedMatch[1].trim() : '';

      // Extract categories
      const categoryMatches = entryXml.match(/<category\s+term="(.*?)"/g);
      const categories: string[] = [];
      if (categoryMatches) {
        for (const catMatch of categoryMatches) {
          const termMatch = catMatch.match(/term="(.*?)"/);
          if (termMatch) {
            categories.push(termMatch[1]);
          }
        }
      }

      // Extract primary category
      const primaryCatMatch = entryXml.match(/<arxiv:primary_category.*?term="(.*?)"/);
      const primaryCategory = primaryCatMatch ? primaryCatMatch[1] : (categories[0] || undefined);

      // Extract PDF link
      const pdfLinkMatch = entryXml.match(/<link\s+title="pdf"\s+href="(.*?)"/);
      const pdfUrl = pdfLinkMatch ? pdfLinkMatch[1] : undefined;

      entries.push({
        id,
        title,
        summary,
        authors,
        published,
        updated,
        categories,
        primaryCategory,
        pdfUrl,
        arxivUrl: id,
      });
    } catch (error) {
      console.warn('⚠️  Failed to parse arXiv entry:', error);
    }
  }

  return entries;
}

/**
 * Build arXiv API query string from search parameters
 */
function buildArxivQuery(params: {
  query?: string;
  author?: string;
  title?: string;
  abstract?: string;
  category?: string;
  all?: string;
}): string {
  const queryParts: string[] = [];

  if (params.all) {
    queryParts.push(`all:${params.all}`);
  }
  if (params.query) {
    queryParts.push(`all:${params.query}`);
  }
  if (params.author) {
    queryParts.push(`au:${params.author}`);
  }
  if (params.title) {
    queryParts.push(`ti:${params.title}`);
  }
  if (params.abstract) {
    queryParts.push(`abs:${params.abstract}`);
  }
  if (params.category) {
    queryParts.push(`cat:${params.category}`);
  }

  return queryParts.join('+AND+');
}

export const arxivTool = tool({
  description: 'Search arXiv.org for academic papers and preprints. Supports searching by keywords, authors, titles, categories, and date ranges. Returns paper metadata including title, authors, abstract, publication date, and PDF links. Use this when users ask about research papers, academic publications, or scientific topics.',
  inputSchema: z.object({
    query: z.string().optional().describe('General search query (searches all fields)'),
    author: z.string().optional().describe('Author name to search for (e.g., "Lecun" or "Hinton")'),
    title: z.string().optional().describe('Keywords to search in paper titles'),
    abstract: z.string().optional().describe('Keywords to search in paper abstracts'),
    category: z.string().optional().describe('arXiv category (e.g., "cs.AI", "math.CO", "physics.gen-ph"). See https://arxiv.org/category_taxonomy'),
    maxResults: z.number().int().min(1).max(50).optional().describe('Maximum number of results to return (default 10, max 50)'),
    sortBy: z.enum(['relevance', 'lastUpdatedDate', 'submittedDate']).optional().describe('Sort order for results (default: relevance)'),
    sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort direction (default: descending)'),
    startIndex: z.number().int().min(0).optional().describe('Start index for pagination (default 0)'),
  }),
  execute: async ({
    query,
    author,
    title,
    abstract,
    category,
    maxResults = 10,
    sortBy = 'relevance',
    sortOrder = 'descending',
    startIndex = 0,
  }) => {
    try {
      // Build search query
      const searchQuery = buildArxivQuery({ query, author, title, abstract, category });

      if (!searchQuery) {
        return {
          success: false,
          error: 'At least one search parameter (query, author, title, abstract, or category) is required',
        };
      }

      console.log(`📚 Searching arXiv for: "${searchQuery}"`);

      // Build API URL
      const baseUrl = 'http://export.arxiv.org/api/query';
      const params = new URLSearchParams({
        search_query: searchQuery,
        start: startIndex.toString(),
        max_results: Math.min(maxResults, 50).toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      const apiUrl = `${baseUrl}?${params.toString()}`;
      console.log(`🔗 API URL: ${apiUrl}`);

      // Fetch results with timeout
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'OmegaBot/1.0 (Discord Bot; https://github.com/thomasdavis/omega)',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `arXiv API request failed with status ${response.status}`,
          statusCode: response.status,
        };
      }

      // Parse XML response
      const xmlText = await response.text();

      // Check for API errors in XML
      if (xmlText.includes('<error>')) {
        const errorMatch = xmlText.match(/<error>(.*?)<\/error>/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown API error';
        return {
          success: false,
          error: `arXiv API error: ${errorMsg}`,
        };
      }

      // Extract total results count
      const totalResultsMatch = xmlText.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
      const totalResults = totalResultsMatch ? parseInt(totalResultsMatch[1]) : 0;

      // Parse entries
      const entries = parseArxivXml(xmlText);

      console.log(`✅ Found ${entries.length} papers (${totalResults} total matches)`);

      // Format results for display
      const papers = entries.map((entry, index) => {
        // Extract arXiv ID from URL (e.g., http://arxiv.org/abs/2104.12345v2 -> 2104.12345)
        const arxivIdMatch = entry.id.match(/arxiv\.org\/abs\/([^v]+)/);
        const arxivId = arxivIdMatch ? arxivIdMatch[1] : entry.id;

        return {
          rank: startIndex + index + 1,
          arxivId,
          title: entry.title,
          authors: entry.authors,
          authorString: entry.authors.join(', '),
          summary: entry.summary.length > 500
            ? entry.summary.substring(0, 500) + '...'
            : entry.summary,
          fullSummary: entry.summary,
          published: entry.published,
          updated: entry.updated,
          categories: entry.categories,
          primaryCategory: entry.primaryCategory,
          pdfUrl: entry.pdfUrl,
          arxivUrl: entry.arxivUrl,
          abstractUrl: `https://arxiv.org/abs/${arxivId}`,
        };
      });

      return {
        success: true,
        query: searchQuery,
        totalResults,
        returnedResults: entries.length,
        startIndex,
        papers,
        searchParams: {
          query,
          author,
          title,
          abstract,
          category,
          sortBy,
          sortOrder,
        },
      };
    } catch (error) {
      console.error('❌ Error querying arXiv:', error);

      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'TimeoutError') {
        return {
          success: false,
          error: 'arXiv API request timed out after 15 seconds. Please try again or reduce the number of results.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error querying arXiv',
      };
    }
  },
});
