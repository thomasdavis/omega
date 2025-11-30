/**
 * Theme System
 * Centralized theming configuration for consistent styling across all pages
 */

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Default theme (matches current tactical/HUD design from index.html)
 */
export const defaultTheme: Theme = {
  colors: {
    primary: '#ff9f1c', // Safety Orange (HUD primary)
    secondary: '#2ec4b6', // Cyan readout (HUD secondary)
    background: '#0f1115', // HUD background
    surface: 'rgba(20, 25, 35, 0.85)', // HUD panel
    text: '#e2e8f0',
    textSecondary: '#64748b',
    border: '#334155',
    accent: '#3b82f6',
    success: '#4CAF50',
    warning: '#ff9f1c',
    error: '#ef4444',
  },
  fonts: {
    heading: "'Chakra Petch', sans-serif",
    body: "'Share Tech Mono', monospace",
    mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace",
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
};

/**
 * Blog theme (matches current blog styling from blogRenderer.ts)
 */
export const blogTheme: Theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#667eea',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)',
    surface: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    accent: '#3b82f6',
    success: '#4CAF50',
    warning: '#ff9f1c',
    error: '#ef4444',
  },
  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace",
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
};

/**
 * Generate CSS custom properties from theme
 */
export function generateThemeCSS(theme: Theme): string {
  return `
    :root {
      /* Colors */
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-background: ${theme.colors.background};
      --theme-surface: ${theme.colors.surface};
      --theme-text: ${theme.colors.text};
      --theme-text-secondary: ${theme.colors.textSecondary};
      --theme-border: ${theme.colors.border};
      --theme-accent: ${theme.colors.accent};
      --theme-success: ${theme.colors.success};
      --theme-warning: ${theme.colors.warning};
      --theme-error: ${theme.colors.error};

      /* Fonts */
      --theme-font-heading: ${theme.fonts.heading};
      --theme-font-body: ${theme.fonts.body};
      --theme-font-mono: ${theme.fonts.mono};

      /* Spacing */
      --theme-spacing-xs: ${theme.spacing.xs};
      --theme-spacing-sm: ${theme.spacing.sm};
      --theme-spacing-md: ${theme.spacing.md};
      --theme-spacing-lg: ${theme.spacing.lg};
      --theme-spacing-xl: ${theme.spacing.xl};

      /* Border Radius */
      --theme-radius-sm: ${theme.borderRadius.sm};
      --theme-radius-md: ${theme.borderRadius.md};
      --theme-radius-lg: ${theme.borderRadius.lg};
    }
  `;
}

/**
 * Get base styles that use theme variables
 */
export function getBaseStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--theme-font-body);
      color: var(--theme-text);
      background: var(--theme-background);
      line-height: 1.75;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: var(--theme-font-heading);
      color: var(--theme-text);
    }

    a {
      color: var(--theme-primary);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    a:hover {
      color: var(--theme-secondary);
    }

    code {
      font-family: var(--theme-font-mono);
    }
  `;
}
