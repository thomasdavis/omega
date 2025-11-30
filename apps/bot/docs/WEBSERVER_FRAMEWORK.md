# Webserver and Site Generator Framework

> Minimal, extensible framework for creating themed pages with SEO-friendly URLs

## Overview

This framework adds professional website capabilities to Omega while maintaining full backward compatibility with the existing artifact server. It provides three core systems:

1. **Theme System** - Centralized styling and theming
2. **URL Router** - Named routes with clean URLs
3. **Page Templates** - Reusable layouts with consistent styling

## Architecture

### Theme System (`src/lib/theme.ts`)

Provides centralized theme configuration and CSS generation.

**Features:**
- Multiple theme presets (default tactical/HUD, blog)
- CSS custom properties generation
- Consistent color schemes, fonts, and spacing
- Reusable base styles

**Example:**

```typescript
import { defaultTheme, generateThemeCSS } from './lib/theme.js';

// Generate CSS custom properties
const themeCSS = generateThemeCSS(defaultTheme);

// Access theme values
console.log(defaultTheme.colors.primary); // '#ff9f1c'
```

**Available Themes:**
- `defaultTheme` - Tactical HUD design (matches index.html)
- `blogTheme` - Clean blog design (matches blog renderer)

### URL Router (`src/lib/router.ts`)

Enables SEO-friendly named routes alongside UUID-based artifacts.

**Features:**
- Slug-based routing (`/pages/about`, `/pages/features`)
- Persistent route index storage
- HTML and Markdown content support
- Route CRUD operations
- Slug validation

**API:**

```typescript
import { setRoute, getRoute, listRoutes, deleteRoute } from './lib/router.js';

// Create a route
setRoute({
  slug: 'about',
  title: 'About Us',
  description: 'Learn more about Omega',
  content: '<p>We are Omega...</p>',
  contentType: 'html',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Get a route
const route = getRoute('about');

// List all routes
const allRoutes = listRoutes();

// Delete a route
deleteRoute('about');
```

**Slug Format:**
- Lowercase letters, numbers, and hyphens only
- Must match regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
- Examples: `about`, `contact-us`, `features-2024`

### Page Templates (`src/lib/pageTemplate.ts`)

Reusable page layouts with theme integration.

**Features:**
- Automatic header/footer generation
- Theme-aware styling
- Build timestamp integration
- Customizable layouts

**API:**

```typescript
import { generatePage, PageMetadata } from './lib/pageTemplate.js';

const html = generatePage({
  metadata: {
    title: 'My Page',
    description: 'Page description',
    keywords: ['keyword1', 'keyword2'],
  },
  content: '<h1>Hello World</h1>',
  includeHeader: true,
  includeFooter: true,
});
```

**Components:**
- `generateHeader()` - Standard site header with navigation
- `generateFooter()` - Standard site footer with build info
- `generatePage()` - Complete HTML page with theme

## Usage

### Creating Pages via API

```typescript
import { setRoute } from './lib/router.js';

setRoute({
  slug: 'features',
  title: 'Features',
  description: 'Omega features overview',
  content: `
    # Key Features

    - **AI-Powered** - GPT-4 integration
    - **50+ Tools** - Comprehensive toolkit
    - **Real-time Collaboration** - Live documents
  `,
  contentType: 'markdown',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### Creating Pages via Discord

Use the `createPage` tool in Discord:

```
/ask Create an about page with our mission statement

Omega will use the createPage tool to create /pages/about
```

**Tool Parameters:**
- `slug` - URL slug (e.g., "about", "contact")
- `title` - Page title
- `description` - Page description (optional)
- `content` - HTML or Markdown content
- `contentType` - "html" or "markdown"

### Accessing Pages

Pages are available at:
```
https://omegaai.dev/pages/{slug}
```

Examples:
- https://omegaai.dev/pages/about
- https://omegaai.dev/pages/features
- https://omegaai.dev/pages/contact

## Routes

### New Routes

| Route | Description |
|-------|-------------|
| `GET /pages/:slug` | Named page route |

### Existing Routes (Unchanged)

All 41 existing routes continue to work:

- `GET /artifacts/:id` - UUID-based artifacts
- `GET /blog` - Blog index
- `GET /blog/:slug` - Individual blog posts
- `GET /uploads/:filename` - File uploads
- `GET /documents.html` - Live documents
- And 36 more...

## Storage

Routes are stored in persistent storage:

**Development:**
```
content/index/routes.json
```

**Production (Railway):**
```
/data/content-index/routes.json
```

**Format:**
```json
{
  "routes": {
    "about": {
      "slug": "about",
      "title": "About Us",
      "description": "Learn more",
      "content": "<p>Content here</p>",
      "contentType": "html",
      "createdAt": "2025-11-30T05:00:00.000Z",
      "updatedAt": "2025-11-30T05:00:00.000Z"
    }
  }
}
```

## Theming

### Using Themes

All pages automatically use the default theme. To customize:

```typescript
import { blogTheme } from './lib/theme.js';

const html = generatePage({
  metadata: {
    title: 'My Page',
    theme: blogTheme, // Use blog theme instead of default
  },
  content: '<h1>Hello</h1>',
});
```

### Custom Styles

Add custom CSS to any page:

```typescript
const html = generatePage({
  metadata: {
    title: 'My Page',
    customStyles: `
      .custom-class {
        color: red;
      }
    `,
  },
  content: '<div class="custom-class">Red text</div>',
});
```

### CSS Variables

All themes provide CSS custom properties:

```css
/* Colors */
--theme-primary
--theme-secondary
--theme-background
--theme-surface
--theme-text
--theme-text-secondary
--theme-border
--theme-accent
--theme-success
--theme-warning
--theme-error

/* Fonts */
--theme-font-heading
--theme-font-body
--theme-font-mono

/* Spacing */
--theme-spacing-xs
--theme-spacing-sm
--theme-spacing-md
--theme-spacing-lg
--theme-spacing-xl

/* Border Radius */
--theme-radius-sm
--theme-radius-md
--theme-radius-lg
```

## When to Use

### Use `createPage` tool for:

✅ Permanent site pages (About, Features, Contact)
✅ SEO-friendly content with clean URLs
✅ Content that should be part of main site structure
✅ Pages that need consistent site theming and navigation

### Use `artifact` tool for:

✅ Interactive HTML demos and experiments
✅ Standalone applications
✅ Temporary or one-off content
✅ Code that needs complete isolation

### Use `generateHtmlPage` tool for:

✅ AI-generated interactive HTML
✅ Quick prototypes from natural language
✅ Self-contained HTML applications

### Use `createBlogPost` tool for:

✅ Blog articles with TTS support
✅ Long-form written content
✅ Date-based content organization

## Examples

### Example 1: About Page

```typescript
setRoute({
  slug: 'about',
  title: 'About Omega',
  description: 'Learn about Omega AI',
  content: `
    # About Omega

    Omega is an autonomous AI system with 50+ integrated tools.

    ## Mission

    Our mission is to push the boundaries of AI-human collaboration.

    ## Technology

    - GPT-4 integration
    - Real-time collaboration
    - Serverless architecture
  `,
  contentType: 'markdown',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### Example 2: Features Page (HTML)

```typescript
setRoute({
  slug: 'features',
  title: 'Features',
  content: `
    <div class="features-grid">
      <div class="feature">
        <h2>AI-Powered</h2>
        <p>Powered by GPT-4 for intelligent responses</p>
      </div>
      <div class="feature">
        <h2>50+ Tools</h2>
        <p>Comprehensive toolkit for any task</p>
      </div>
    </div>
  `,
  contentType: 'html',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

## Backward Compatibility

This framework is designed for **zero breaking changes**:

✅ All existing artifact URLs continue to work
✅ UUID-based routing unchanged
✅ Blog rendering unchanged
✅ Static file serving unchanged
✅ All 41 existing routes preserved
✅ Existing tools work as before

The new routing system is **additive only** - it adds new capabilities without modifying existing behavior.

## Future Enhancements

This minimal framework provides a foundation for:

- Page listing/gallery
- Navigation menu generation
- Sitemap generation
- RSS feeds
- Search functionality
- Categories/tags
- Draft/published workflow
- Page templates
- Custom layouts
- Admin dashboard
- Full CMS capabilities

## Technical Details

**File Locations:**
- `apps/bot/src/lib/theme.ts` - Theme system
- `apps/bot/src/lib/router.ts` - URL router
- `apps/bot/src/lib/pageTemplate.ts` - Page templates
- `apps/bot/src/agent/tools/createPage.ts` - CreatePage tool
- `apps/bot/src/server/artifactServer.ts` - Express routes (line 1533)

**Dependencies:**
- Express.js for routing
- Filesystem for route storage
- Existing storage utilities

**TypeScript:**
All code is fully typed with TypeScript interfaces.

## Contributing

When adding new features:

1. Maintain backward compatibility
2. Use the theme system for styling
3. Follow existing naming conventions
4. Add tests for new functionality
5. Update this documentation

## Resources

- [Express Routing Documentation](https://expressjs.com/en/guide/routing.html)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [CLAUDE.md](../../CLAUDE.md) - Project guidelines

---

**Last Updated:** 2025-11-30
**Version:** 1.0.0
**Status:** ✅ Production Ready
