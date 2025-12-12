import { NextRequest, NextResponse } from 'next/server';
import { prisma, listRssFeedItems, saveRssFeedItem, rssFeedItemExists } from '@repo/database';
import { generateMessageSummary } from '@repo/shared';
import RSS from 'rss';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rss
 * Generates an RSS feed from Discord messages
 * Query params:
 * - limit: Number of items to include (default: 50, max: 100)
 * - generate: If 'true', generates new summaries for recent messages (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const shouldGenerate = searchParams.get('generate') === 'true';

    // If generate=true, fetch recent messages and create RSS items for new ones
    if (shouldGenerate) {
      await generateNewRssItems();
    }

    // Fetch RSS feed items from database
    const rssItems = await listRssFeedItems(limit, 0);

    // Build RSS feed
    const feed = new RSS({
      title: 'Omega Discord Feed',
      description: 'Intelligently summarized Discord messages and links from the Omega community',
      feed_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/rss`,
      site_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      language: 'en',
      pubDate: new Date(),
      ttl: 60, // Cache for 60 minutes
    });

    // Add items to feed
    for (const item of rssItems) {
      feed.item({
        title: item.summary.substring(0, 100) + (item.summary.length > 100 ? '...' : ''),
        description: item.summary,
        url: item.link || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages/${item.message_id}`,
        guid: item.id,
        date: item.created_at,
      });
    }

    // Return RSS XML
    const xml = feed.xml({ indent: true });
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    );
  }
}

/**
 * Generate new RSS items from recent Discord messages
 * Only processes messages that haven't been added to the RSS feed yet
 */
async function generateNewRssItems(): Promise<void> {
  try {
    // Fetch recent human messages from Discord
    const recentMessages = await prisma.message.findMany({
      where: {
        senderType: 'human',
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50, // Check last 50 messages
    });

    // Process each message
    for (const message of recentMessages) {
      // Skip if already in RSS feed
      const exists = await rssFeedItemExists(message.id);
      if (exists) {
        continue;
      }

      // Extract links from message content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const links = message.messageContent.match(urlRegex);
      const firstLink = links?.[0] || null;

      // Use existing AI summary if available, otherwise generate new one
      let summary = message.aiSummary;
      if (!summary || summary === 'Summary generation failed') {
        try {
          summary = await generateMessageSummary(message.messageContent);
        } catch (error) {
          console.error(`Failed to generate summary for message ${message.id}:`, error);
          summary = message.messageContent.substring(0, 200) + (message.messageContent.length > 200 ? '...' : '');
        }
      }

      // Enhance summary with username context
      const enhancedSummary = `${message.username || 'Anonymous'}: ${summary}`;

      // Save to RSS feed items
      await saveRssFeedItem({
        messageId: message.id,
        summary: enhancedSummary,
        link: firstLink,
      });

      console.log(`Added RSS item for message ${message.id}`);
    }
  } catch (error) {
    console.error('Error generating new RSS items:', error);
    throw error;
  }
}
