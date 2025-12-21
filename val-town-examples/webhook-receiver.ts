/**
 * Val Town Webhook Receiver for Discord Bookmarks
 *
 * Deploy this as an HTTP Val on Val Town
 * Name suggestion: bookmarksWebhook
 *
 * This val receives bookmark data from the Omega Discord bot and stores it in SQLite
 */

import { sqlite } from "https://esm.town/v/std/sqlite";

interface BookmarkPayload {
  links: string[];
  user: {
    id: string;
    username: string;
  };
  channel: {
    id: string;
    name: string;
  };
  message: {
    id: string;
    content: string;
    timestamp: string;
  };
}

export default async function(req: Request): Promise<Response> {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse the incoming JSON payload
    const payload: BookmarkPayload = await req.json();

    // Validate payload
    if (!payload.links || !Array.isArray(payload.links) || payload.links.length === 0) {
      return new Response(
        JSON.stringify({ error: "No links provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create bookmarks table if it doesn't exist
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        message_id TEXT NOT NULL,
        message_content TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(link, message_id)
      )
    `);

    // Create index for faster searches
    await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)
    `);
    await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_channel_id ON bookmarks(channel_id)
    `);
    await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC)
    `);

    // Insert each link as a bookmark
    let inserted = 0;
    let skipped = 0;

    for (const link of payload.links) {
      try {
        await sqlite.execute({
          sql: `
            INSERT INTO bookmarks (
              link, user_id, username, channel_id, channel_name,
              message_id, message_content, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(link, message_id) DO NOTHING
          `,
          args: [
            link,
            payload.user.id,
            payload.user.username,
            payload.channel.id,
            payload.channel.name,
            payload.message.id,
            payload.message.content,
            payload.message.timestamp,
          ],
        });
        inserted++;
      } catch (err) {
        console.error(`Failed to insert bookmark: ${link}`, err);
        skipped++;
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${payload.links.length} link(s)`,
        inserted,
        skipped,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing bookmark webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
