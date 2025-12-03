/**
 * Theme System - Centralized styling with CSS custom properties
 * Provides consistent theming across all pages in the site generator
 */

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    error: string;
    success: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  spacing: {
    container: string;
  };
}

/**
 * Default tactical/HUD theme - matches Omega's tactical aesthetic
 */
export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: '#00ff41',
    secondary: '#0a4d1a',
    background: '#0a0e0a',
    surface: '#1a1f1a',
    text: '#e0ffe0',
    textMuted: '#6a8a6a',
    border: '#00ff4133',
    accent: '#00ccff',
    error: '#ff4444',
    success: '#00ff41',
  },
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    mono: '"Courier New", Courier, monospace',
  },
  spacing: {
    container: '900px',
  },
};

/**
 * Blog theme - cleaner, more readable theme for blog posts
 */
export const blogTheme: Theme = {
  name: 'blog',
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#333333',
    textMuted: '#666666',
    border: '#e0e0e0',
    accent: '#667eea',
    error: '#dc3545',
    success: '#28a745',
  },
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    mono: '"Courier New", Courier, monospace',
  },
  spacing: {
    container: '800px',
  },
};

/**
 * Generate CSS custom properties from theme
 */
export function generateThemeCSS(theme: Theme): string {
  return `
    :root {
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-background: ${theme.colors.background};
      --color-surface: ${theme.colors.surface};
      --color-text: ${theme.colors.text};
      --color-text-muted: ${theme.colors.textMuted};
      --color-border: ${theme.colors.border};
      --color-accent: ${theme.colors.accent};
      --color-error: ${theme.colors.error};
      --color-success: ${theme.colors.success};
      --font-sans: ${theme.fonts.sans};
      --font-mono: ${theme.fonts.mono};
      --spacing-container: ${theme.spacing.container};
    }
  `;
}

/**
 * Generate base CSS styles using theme
 */
export function generateBaseStyles(theme: Theme): string {
  return `
    ${generateThemeCSS(theme)}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-sans);
      line-height: 1.6;
      color: var(--color-text);
      background: var(--color-background);
      padding: 20px;
    }

    .container {
      max-width: var(--spacing-container);
      margin: 0 auto;
    }

    a {
      color: var(--color-accent);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-bottom: 1rem;
      line-height: 1.3;
    }

    h1 {
      font-size: 2.5em;
      color: var(--color-primary);
    }

    h2 {
      font-size: 2em;
      margin-top: 2rem;
    }

    h3 {
      font-size: 1.5em;
      margin-top: 1.5rem;
    }

    p {
      margin-bottom: 1rem;
    }

    code {
      background: var(--color-surface);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 0.9em;
      border: 1px solid var(--color-border);
    }

    pre {
      background: var(--color-surface);
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 1rem;
      border: 1px solid var(--color-border);
    }

    pre code {
      background: none;
      padding: 0;
      border: none;
    }

    .header {
      border-bottom: 2px solid var(--color-border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .footer {
      border-top: 2px solid var(--color-border);
      padding-top: 20px;
      margin-top: 50px;
      color: var(--color-text-muted);
      font-size: 0.9em;
    }

    .nav {
      list-style: none;
      display: flex;
      gap: 20px;
      margin-top: 15px;
      flex-wrap: wrap;
    }

    .nav li {
      display: inline;
    }
  `;
}

/**
 * Get theme by name
 */
export function getTheme(name: string): Theme {
  switch (name) {
    case 'blog':
      return blogTheme;
    case 'default':
    default:
      return defaultTheme;
  }
}
