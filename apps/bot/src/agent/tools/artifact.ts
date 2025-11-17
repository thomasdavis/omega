/**
 * Artifact Tool - Generate and preview artifacts (HTML, SVG, Markdown, etc.)
 * Allows creating interactive content with shareable preview links
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Artifacts directory - store generated content
// Use persistent Fly.io Volume if available, otherwise fall back to local artifacts folder
const ARTIFACTS_DIR = process.env.NODE_ENV === 'production' && existsSync('/data/artifacts')
  ? '/data/artifacts'
  : join(__dirname, '../../../artifacts');

// Ensure artifacts directory exists
if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

interface ArtifactMetadata {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  filename: string;
}

/**
 * Generate HTML artifact with optional CSS and JavaScript
 */
function generateHTML(title: string, content: string, css?: string, js?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    ${css || ''}
  </style>
</head>
<body>
  ${content}
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
}

/**
 * Generate SVG artifact
 */
function generateSVG(content: string, width: number = 800, height: number = 600): string {
  // If content is already a complete SVG, return it
  if (content.trim().startsWith('<svg')) {
    return content;
  }

  // Otherwise, wrap it in SVG tags
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${content}
</svg>`;
}

/**
 * Generate Markdown artifact with HTML wrapper for preview
 */
function generateMarkdown(title: string, content: string): string {
  // For preview purposes, we'll wrap markdown in HTML with a simple renderer
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre code {
      background: none;
      padding: 0;
    }
  </style>
</head>
<body>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

/**
 * Generate interactive calendar artifact
 */
function generateCalendar(title: string, month?: number, year?: number): string {
  const now = new Date();
  const displayMonth = month !== undefined ? month : now.getMonth();
  const displayYear = year !== undefined ? year : now.getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .calendar-container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      max-width: 600px;
      width: 100%;
    }
    .calendar-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .calendar-header h1 {
      font-size: 2em;
      margin-bottom: 10px;
    }
    .calendar-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    .calendar-nav button {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      transition: all 0.3s;
    }
    .calendar-nav button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    .current-month {
      font-size: 1.5em;
      font-weight: 600;
    }
    .calendar-grid {
      padding: 30px;
    }
    .weekday-labels {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    .weekday-label {
      text-align: center;
      font-weight: 600;
      color: #667eea;
      padding: 10px;
      font-size: 0.9em;
    }
    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }
    .day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .day:not(.empty):hover {
      background: #f0f0f0;
      transform: scale(1.1);
    }
    .day.today {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .day.selected {
      background: #764ba2;
      color: white;
      font-weight: 700;
    }
    .day.empty {
      pointer-events: none;
    }
    .day.has-event::after {
      content: '';
      position: absolute;
      bottom: 5px;
      width: 6px;
      height: 6px;
      background: #ff6b6b;
      border-radius: 50%;
    }
    .events-panel {
      padding: 20px 30px 30px;
      border-top: 2px solid #f0f0f0;
      display: none;
    }
    .events-panel.active {
      display: block;
    }
    .events-title {
      font-size: 1.2em;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
    }
    .event-item {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 4px solid #667eea;
    }
    .event-time {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 5px;
    }
    .event-name {
      font-weight: 600;
      color: #333;
    }
    .add-event-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      width: 100%;
      margin-top: 15px;
      transition: transform 0.2s;
    }
    .add-event-btn:hover {
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="calendar-container">
    <div class="calendar-header">
      <h1>📅 ${escapeHtml(title)}</h1>
      <div class="calendar-nav">
        <button onclick="changeMonth(-1)">← Previous</button>
        <span class="current-month" id="currentMonth"></span>
        <button onclick="changeMonth(1)">Next →</button>
      </div>
    </div>

    <div class="calendar-grid">
      <div class="weekday-labels">
        <div class="weekday-label">Sun</div>
        <div class="weekday-label">Mon</div>
        <div class="weekday-label">Tue</div>
        <div class="weekday-label">Wed</div>
        <div class="weekday-label">Thu</div>
        <div class="weekday-label">Fri</div>
        <div class="weekday-label">Sat</div>
      </div>
      <div class="days-grid" id="daysGrid"></div>
    </div>

    <div class="events-panel" id="eventsPanel">
      <div class="events-title" id="eventsTitle">Events</div>
      <div id="eventsList"></div>
      <button class="add-event-btn" onclick="addEvent()">+ Add Event</button>
    </div>
  </div>

  <script>
    let currentMonth = ${displayMonth};
    let currentYear = ${displayYear};
    let selectedDate = null;

    // Sample events storage (in a real app, this would be in a database)
    const events = {
      // Format: 'YYYY-MM-DD': [{time: '10:00 AM', name: 'Event name'}]
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    function renderCalendar() {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      document.getElementById('currentMonth').textContent =
        monthNames[currentMonth] + ' ' + currentYear;

      const daysGrid = document.getElementById('daysGrid');
      daysGrid.innerHTML = '';

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        daysGrid.appendChild(emptyDay);
      }

      // Add days of the month
      const today = new Date();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.textContent = day;

        const dateKey = currentYear + '-' +
          String(currentMonth + 1).padStart(2, '0') + '-' +
          String(day).padStart(2, '0');

        // Check if this is today
        if (day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()) {
          dayElement.classList.add('today');
        }

        // Check if this day has events
        if (events[dateKey] && events[dateKey].length > 0) {
          dayElement.classList.add('has-event');
        }

        dayElement.onclick = () => selectDate(day);
        daysGrid.appendChild(dayElement);
      }
    }

    function selectDate(day) {
      selectedDate = day;
      const dateKey = currentYear + '-' +
        String(currentMonth + 1).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');

      // Update selected styling
      document.querySelectorAll('.day').forEach(d => {
        d.classList.remove('selected');
        if (d.textContent === String(day) && !d.classList.contains('empty')) {
          d.classList.add('selected');
        }
      });

      // Show events panel
      const eventsPanel = document.getElementById('eventsPanel');
      eventsPanel.classList.add('active');

      document.getElementById('eventsTitle').textContent =
        'Events for ' + monthNames[currentMonth] + ' ' + day + ', ' + currentYear;

      // Display events for this date
      const eventsList = document.getElementById('eventsList');
      const dayEvents = events[dateKey] || [];

      if (dayEvents.length === 0) {
        eventsList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No events scheduled</p>';
      } else {
        eventsList.innerHTML = dayEvents.map(event =>
          '<div class="event-item">' +
          '<div class="event-time">' + event.time + '</div>' +
          '<div class="event-name">' + event.name + '</div>' +
          '</div>'
        ).join('');
      }
    }

    function changeMonth(delta) {
      currentMonth += delta;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
      document.getElementById('eventsPanel').classList.remove('active');
    }

    function addEvent() {
      if (selectedDate === null) {
        alert('Please select a date first');
        return;
      }

      const eventName = prompt('Event name:');
      const eventTime = prompt('Event time (e.g., 10:00 AM):');

      if (eventName && eventTime) {
        const dateKey = currentYear + '-' +
          String(currentMonth + 1).padStart(2, '0') + '-' +
          String(selectedDate).padStart(2, '0');

        if (!events[dateKey]) {
          events[dateKey] = [];
        }

        events[dateKey].push({ time: eventTime, name: eventName });
        renderCalendar();
        selectDate(selectedDate);
      }
    }

    // Initial render
    renderCalendar();
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Save artifact to filesystem
 */
function saveArtifact(
  content: string,
  type: string,
  title: string,
  description: string
): ArtifactMetadata {
  const id = randomUUID();
  const extension = type === 'svg' ? 'svg' : 'html';
  const filename = `${id}.${extension}`;
  const filepath = join(ARTIFACTS_DIR, filename);

  // Save the artifact file
  writeFileSync(filepath, content, 'utf-8');

  // Save metadata
  const metadata: ArtifactMetadata = {
    id,
    type,
    title,
    description,
    createdAt: new Date().toISOString(),
    filename,
  };

  const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export const artifactTool = tool({
  description: `Generate interactive artifacts (HTML pages, SVG graphics, calendars, diagrams, etc.) with shareable preview links.
  Perfect for creating visualizations, demos, interactive content, or any web-based artifacts that users can view in their browser.

  Calendar type: Creates a beautiful interactive grid layout calendar with month navigation, event highlighting, and the ability to add events.`,
  inputSchema: z.object({
    type: z.enum(['html', 'svg', 'markdown', 'calendar']).describe('Type of artifact to generate'),
    title: z.string().describe('Title of the artifact'),
    description: z.string().describe('Brief description of what the artifact shows or does'),
    content: z.string().optional().describe('Main content of the artifact (HTML body, SVG elements, or Markdown text). Not required for calendar type.'),
    css: z.string().optional().describe('Optional CSS styles (for HTML artifacts only)'),
    js: z.string().optional().describe('Optional JavaScript code (for HTML artifacts only)'),
    width: z.number().optional().describe('Width for SVG artifacts (default: 800)'),
    height: z.number().optional().describe('Height for SVG artifacts (default: 600)'),
    month: z.number().optional().describe('Month for calendar (0-11, where 0=January). Defaults to current month.'),
    year: z.number().optional().describe('Year for calendar (e.g., 2025). Defaults to current year.'),
  }),
  execute: async ({ type, title, description, content, css, js, width, height, month, year }) => {
    try {
      let artifactContent: string;

      switch (type) {
        case 'html':
          if (!content) {
            throw new Error('Content is required for HTML artifacts');
          }
          artifactContent = generateHTML(title, content, css, js);
          break;
        case 'svg':
          if (!content) {
            throw new Error('Content is required for SVG artifacts');
          }
          artifactContent = generateSVG(content, width, height);
          break;
        case 'markdown':
          if (!content) {
            throw new Error('Content is required for Markdown artifacts');
          }
          artifactContent = generateMarkdown(title, content);
          break;
        case 'calendar':
          artifactContent = generateCalendar(title, month, year);
          break;
        default:
          throw new Error(`Unsupported artifact type: ${type}`);
      }

      const metadata = saveArtifact(artifactContent, type, title, description);

      // Get server URL from environment or use default
      // In production on Fly.io, use the app URL; locally use localhost
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omega-production-5b33.up.railway.app' : 'http://localhost:3001');
      const previewUrl = `${serverUrl}/artifacts/${metadata.id}`;

      return {
        success: true,
        artifactId: metadata.id,
        type: metadata.type,
        title: metadata.title,
        description: metadata.description,
        previewUrl,
        filename: metadata.filename,
        message: `Artifact created! View it at: ${previewUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate artifact',
      };
    }
  },
});
