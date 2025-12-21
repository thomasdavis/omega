/**
 * Val Town Discord Bookmarks Page Template
 *
 * This template creates a searchable bookmark page for Discord links.
 * Deploy this to Val Town to get a live, public-facing page without database migrations.
 *
 * Features:
 * - Searchable link collection
 * - Filter by tags, user, channel
 * - Responsive design
 * - No database required (fetches from Omega API)
 *
 * To deploy:
 * 1. Use the valTownCreateVal tool
 * 2. Pass this code as the 'code' parameter
 * 3. Set type to 'http'
 * 4. Set privacy to 'unlisted' or 'public'
 */

export const DISCORD_BOOKMARKS_VAL_TEMPLATE = `export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag');
  const search = url.searchParams.get('search');
  const user = url.searchParams.get('user');
  const channel = url.searchParams.get('channel');

  // Fetch links from Omega API
  const OMEGA_API_URL = 'https://omegaai.dev';
  let apiUrl = \`\${OMEGA_API_URL}/api/shared-links?limit=100\`;

  if (tag) apiUrl += \`&tag=\${encodeURIComponent(tag)}\`;
  if (search) apiUrl += \`&search=\${encodeURIComponent(search)}\`;
  if (user) apiUrl += \`&userId=\${encodeURIComponent(user)}\`;
  if (channel) apiUrl += \`&channelId=\${encodeURIComponent(channel)}\`;

  let links = [];
  let tags = [];

  try {
    const [linksRes, tagsRes] = await Promise.all([
      fetch(apiUrl),
      fetch(\`\${OMEGA_API_URL}/api/shared-links/tags\`)
    ]);

    if (linksRes.ok) {
      const data = await linksRes.json();
      links = data.links || [];
    }

    if (tagsRes.ok) {
      const tagsData = await tagsRes.json();
      tags = tagsData.tags || [];
    }
  } catch (error) {
    console.error('Failed to fetch links:', error);
  }

  // Build HTML
  const html = \`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Bookmarks</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        h1 {
          color: #667eea;
          margin-bottom: 10px;
          font-size: 2.5em;
        }

        .subtitle {
          color: #666;
          margin-bottom: 30px;
        }

        .search-bar {
          margin-bottom: 20px;
        }

        .search-bar input {
          width: 100%;
          padding: 12px 20px;
          font-size: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: border-color 0.3s;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #667eea;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 30px;
        }

        .tag {
          padding: 6px 14px;
          background: #f0f0f0;
          border-radius: 20px;
          font-size: 14px;
          text-decoration: none;
          color: #333;
          transition: all 0.3s;
        }

        .tag:hover, .tag.active {
          background: #667eea;
          color: white;
        }

        .links {
          display: grid;
          gap: 16px;
        }

        .link-card {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border-left: 4px solid #667eea;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .link-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .link-card h3 {
          margin-bottom: 8px;
          font-size: 1.2em;
        }

        .link-card h3 a {
          color: #667eea;
          text-decoration: none;
        }

        .link-card h3 a:hover {
          text-decoration: underline;
        }

        .link-description {
          color: #666;
          margin-bottom: 12px;
        }

        .link-url {
          font-size: 14px;
          color: #999;
          word-break: break-all;
          margin-bottom: 10px;
        }

        .link-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: #888;
          margin-bottom: 10px;
        }

        .link-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .link-tag {
          padding: 4px 10px;
          background: #e0e0e0;
          border-radius: 12px;
          font-size: 12px;
          color: #555;
        }

        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .stats {
          background: #f0f4ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          color: #667eea;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .container {
            padding: 20px;
          }

          h1 {
            font-size: 2em;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔖 Discord Bookmarks</h1>
        <p class="subtitle">Shared links from the Omega Discord community</p>

        <div class="stats">
          📊 \${links.length} link\${links.length !== 1 ? 's' : ''} found
          \${tag ? \` · Filtered by tag: <strong>\${tag}</strong>\` : ''}
          \${search ? \` · Search: <strong>\${search}</strong>\` : ''}
        </div>

        <div class="search-bar">
          <input
            type="text"
            placeholder="🔍 Search links..."
            value="\${search || ''}"
            onkeyup="if(event.key==='Enter') window.location.href='?search='+encodeURIComponent(this.value)"
          />
        </div>

        <div class="tags">
          <a href="?" class="tag \${!tag ? 'active' : ''}">All</a>
          \${tags.slice(0, 20).map(t => \`
            <a href="?tag=\${encodeURIComponent(t.tag)}" class="tag \${tag === t.tag ? 'active' : ''}">
              \${t.tag} (\${t.count})
            </a>
          \`).join('')}
        </div>

        <div class="links">
          \${links.length === 0 ? \`
            <div class="no-results">
              <h3>No links found</h3>
              <p>Try a different search or tag</p>
            </div>
          \` : links.map(link => \`
            <div class="link-card">
              <h3><a href="\${link.url}" target="_blank">\${link.title || 'Untitled Link'}</a></h3>
              \${link.description ? \`<p class="link-description">\${link.description}</p>\` : ''}
              <div class="link-url">\${link.url}</div>
              <div class="link-meta">
                <span>👤 \${link.added_by_username || 'Unknown'}</span>
                <span>📅 \${new Date(link.created_at).toLocaleDateString()}</span>
                \${link.category ? \`<span>📁 \${link.category}</span>\` : ''}
              </div>
              \${link.tags && link.tags.length > 0 ? \`
                <div class="link-tags">
                  \${link.tags.map(t => \`
                    <span class="link-tag">\${t}</span>
                  \`).join('')}
                </div>
              \` : ''}
            </div>
          \`).join('')}
        </div>
      </div>
    </body>
    </html>
  \`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
  });
}`;

/**
 * Simple webhook receiver val template
 * Receives webhook data and stores it in Val Town KV storage
 */
export const WEBHOOK_RECEIVER_VAL_TEMPLATE = `import { blob } from "https://esm.town/v/std/blob";

export default async function(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const data = await req.json();

    // Store in Val Town blob storage
    const timestamp = new Date().toISOString();
    const key = \`webhook_\${timestamp}_\${Math.random().toString(36).substring(7)}\`;

    await blob.setJSON(key, {
      timestamp,
      data,
    });

    return Response.json({
      success: true,
      message: 'Webhook received',
      key,
      timestamp,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}`;

/**
 * Link collector val with API endpoint
 */
export const LINK_COLLECTOR_VAL_TEMPLATE = `import { blob } from "https://esm.town/v/std/blob";

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // GET - Retrieve all links
  if (req.method === 'GET') {
    const links = await blob.list({ prefix: 'link_' });
    const allLinks = await Promise.all(
      links.map(async (key) => {
        const data = await blob.getJSON(key);
        return { key, ...data };
      })
    );

    return Response.json({
      links: allLinks.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      ),
      count: allLinks.length,
    });
  }

  // POST - Add a new link
  if (req.method === 'POST') {
    const data = await req.json();
    const timestamp = new Date().toISOString();
    const key = \`link_\${timestamp}_\${Math.random().toString(36).substring(7)}\`;

    await blob.setJSON(key, {
      ...data,
      timestamp,
    });

    return Response.json({
      success: true,
      key,
      timestamp,
    });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}`;
