/**
 * Val Town Bookmarks UI
 *
 * Deploy this as an HTTP Val on Val Town
 * Name suggestion: bookmarksUI
 *
 * This val displays all bookmarks in a searchable, sortable table
 */

/** @jsxImportSource https://esm.sh/react */
import { sqlite } from "https://esm.town/v/std/sqlite";

interface Bookmark {
  id: number;
  link: string;
  user_id: string;
  username: string;
  channel_id: string;
  channel_name: string;
  message_id: string;
  message_content: string;
  created_at: string;
}

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const user = url.searchParams.get("user") || "";
  const channel = url.searchParams.get("channel") || "";

  // Build SQL query with filters
  let sql = "SELECT * FROM bookmarks WHERE 1=1";
  const args: string[] = [];

  if (search) {
    sql += " AND (link LIKE ? OR message_content LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }

  if (user) {
    sql += " AND username LIKE ?";
    args.push(`%${user}%`);
  }

  if (channel) {
    sql += " AND channel_name LIKE ?";
    args.push(`%${channel}%`);
  }

  sql += " ORDER BY created_at DESC LIMIT 100";

  // Fetch bookmarks from database
  let bookmarks: Bookmark[] = [];
  try {
    const result = await sqlite.execute({ sql, args });
    bookmarks = result.rows as Bookmark[];
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
  }

  // Get unique users and channels for filters
  const users = await sqlite.execute("SELECT DISTINCT username FROM bookmarks ORDER BY username");
  const channels = await sqlite.execute("SELECT DISTINCT channel_name FROM bookmarks ORDER BY channel_name");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Bookmarks</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      opacity: 0.9;
      font-size: 1.1rem;
    }
    .filters {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filter-group {
      flex: 1;
      min-width: 200px;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
      font-size: 0.9rem;
    }
    input, select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    .results {
      padding: 2rem;
    }
    .stats {
      margin-bottom: 1.5rem;
      color: #6c757d;
      font-size: 0.95rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #495057;
      border-bottom: 2px solid #e9ecef;
    }
    td {
      padding: 1rem;
      border-bottom: 1px solid #e9ecef;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .link {
      color: #667eea;
      text-decoration: none;
      word-break: break-all;
      font-weight: 500;
    }
    .link:hover {
      text-decoration: underline;
    }
    .username {
      color: #495057;
      font-weight: 600;
    }
    .channel {
      display: inline-block;
      background: #e7f3ff;
      color: #0066cc;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .message {
      color: #6c757d;
      font-size: 0.9rem;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .date {
      color: #868e96;
      font-size: 0.85rem;
    }
    .empty {
      text-align: center;
      padding: 3rem;
      color: #6c757d;
    }
    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      h1 { font-size: 1.75rem; }
      .filters { flex-direction: column; }
      table { font-size: 0.9rem; }
      td, th { padding: 0.75rem 0.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔖 Discord Bookmarks</h1>
      <p class="subtitle">Links shared in Discord, saved and searchable</p>
    </header>

    <form class="filters" method="GET">
      <div class="filter-group">
        <label for="search">Search Links & Messages</label>
        <input
          type="text"
          id="search"
          name="search"
          placeholder="Search for links or message content..."
          value="${search}"
        />
      </div>
      <div class="filter-group">
        <label for="user">Filter by User</label>
        <select id="user" name="user">
          <option value="">All Users</option>
          ${users.rows.map((u: any) => `
            <option value="${u.username}" ${u.username === user ? 'selected' : ''}>
              ${u.username}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="channel">Filter by Channel</label>
        <select id="channel" name="channel">
          <option value="">All Channels</option>
          ${channels.rows.map((c: any) => `
            <option value="${c.channel_name}" ${c.channel_name === channel ? 'selected' : ''}>
              #${c.channel_name}
            </option>
          `).join('')}
        </select>
      </div>
    </form>

    <div class="results">
      <div class="stats">
        Showing ${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}
      </div>

      ${bookmarks.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Link</th>
              <th>User</th>
              <th>Channel</th>
              <th>Message</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${bookmarks.map((b: Bookmark) => {
              const date = new Date(b.created_at);
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return `
                <tr>
                  <td>
                    <a href="${b.link}" target="_blank" rel="noopener noreferrer" class="link">
                      ${b.link}
                    </a>
                  </td>
                  <td><span class="username">${b.username}</span></td>
                  <td><span class="channel">#${b.channel_name}</span></td>
                  <td><div class="message" title="${b.message_content}">${b.message_content || '—'}</div></td>
                  <td><span class="date">${formattedDate}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <h2>No bookmarks found</h2>
          <p>Share some links in Discord to get started!</p>
        </div>
      `}
    </div>
  </div>

  <script>
    // Auto-submit form when filters change
    const form = document.querySelector('form');
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
      input.addEventListener('change', () => form.submit());
    });

    // Debounce search input
    let searchTimeout;
    document.getElementById('search').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => form.submit(), 500);
    });
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
