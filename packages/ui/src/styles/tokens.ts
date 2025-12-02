/**
 * Design Tokens for Omega UI
 *
 * Centralized design system tokens matching the dark, minimalist aesthetic
 * of the Omega AI application. Inspired by Vercel's Geist design system.
 */

export const tokens = {
  /**
   * Color palette - Dark theme with teal accents
   */
  colors: {
    // Background colors (dark theme)
    background: {
      primary: '#09090b',    // zinc-950 - darkest background
      secondary: '#18181b',  // zinc-900 - card/panel background
      tertiary: '#27272a',   // zinc-800 - hover states, inputs
    },

    // Border colors
    border: {
      DEFAULT: '#27272a',    // zinc-800 - primary borders
      subtle: '#3f3f46',     // zinc-700 - subtle borders, hover
    },

    // Text colors
    text: {
      primary: '#ffffff',    // white - primary text
      secondary: '#a1a1aa',  // zinc-400 - secondary text, descriptions
      tertiary: '#71717a',   // zinc-500 - disabled, placeholders
      muted: '#52525b',      // zinc-600 - very subtle text
    },

    // Primary accent (teal)
    primary: {
      DEFAULT: '#14b8a6',    // teal-500 - primary actions
      light: '#2dd4bf',      // teal-400 - hover states (lighter)
      dark: '#0d9488',       // teal-600 - active/pressed states
    },

    // Semantic colors
    semantic: {
      success: '#4ade80',    // green-400
      error: '#f87171',      // red-400
      warning: '#fbbf24',    // amber-400
      info: '#60a5fa',       // blue-400
    },

    // Secondary accents (used sparingly)
    accents: {
      purple: '#c084fc',     // purple-400
      amber: '#fbbf24',      // amber-400
      blue: '#60a5fa',       // blue-400
      orange: '#ea580c',     // orange-600
    },
  },

  /**
   * Typography scale and font families
   */
  typography: {
    // Font families
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ].join(', '),
      mono: [
        'SF Mono',
        'Monaco',
        'Inconsolata',
        'Roboto Mono',
        'Consolas',
        'monospace',
      ].join(', '),
    },

    // Font sizes (with line heights)
    fontSize: {
      xs: { size: '0.75rem', lineHeight: '1rem' },       // 12px / 16px - labels, badges
      sm: { size: '0.875rem', lineHeight: '1.25rem' },   // 14px / 20px - body small
      base: { size: '1rem', lineHeight: '1.5rem' },      // 16px / 24px - body
      lg: { size: '1.125rem', lineHeight: '1.75rem' },   // 18px / 28px - body large
      xl: { size: '1.25rem', lineHeight: '1.75rem' },    // 20px / 28px - subheadings
      '2xl': { size: '1.5rem', lineHeight: '2rem' },     // 24px / 32px - section headers
      '3xl': { size: '1.875rem', lineHeight: '2.25rem' },// 30px / 36px
      '4xl': { size: '2.25rem', lineHeight: '2.5rem' },  // 36px / 40px
      '5xl': { size: '3rem', lineHeight: '1' },          // 48px - page headers
    },

    // Font weights
    fontWeight: {
      light: '300',      // Primary weight used throughout
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    // Letter spacing (tracking)
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',    // Used for uppercase labels
    },
  },

  /**
   * Spacing scale (based on 4px base unit)
   */
  spacing: {
    '0': '0',
    '1': '0.25rem',   // 4px
    '2': '0.5rem',    // 8px
    '3': '0.75rem',   // 12px
    '4': '1rem',      // 16px
    '5': '1.25rem',   // 20px
    '6': '1.5rem',    // 24px - primary spacing
    '7': '1.75rem',   // 28px
    '8': '2rem',      // 32px
    '10': '2.5rem',   // 40px
    '12': '3rem',     // 48px
    '16': '4rem',     // 64px
    '20': '5rem',     // 80px
    '24': '6rem',     // 96px
  },

  /**
   * Layout constraints
   */
  layout: {
    maxWidth: {
      xs: '20rem',      // 320px
      sm: '24rem',      // 384px
      md: '28rem',      // 448px
      lg: '32rem',      // 512px
      xl: '36rem',      // 576px
      '2xl': '42rem',   // 672px
      '3xl': '48rem',   // 768px
      '4xl': '56rem',   // 896px
      '5xl': '64rem',   // 1024px
      '6xl': '72rem',   // 1152px
      '7xl': '80rem',   // 1280px - primary container width
    },
  },

  /**
   * Visual effects (shadows, blur, etc.)
   */
  effects: {
    // Border radius
    borderRadius: {
      none: '0',
      sm: '0.125rem',    // 2px
      DEFAULT: '0.25rem',// 4px
      md: '0.375rem',    // 6px
      lg: '0.5rem',      // 8px
      xl: '0.75rem',     // 12px
      '2xl': '1rem',     // 16px
      full: '9999px',    // pills/circles
    },

    // Box shadows (subtle, dark theme)
    boxShadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    },

    // Backdrop blur
    backdropBlur: {
      none: '0',
      sm: '4px',         // Used in overlays
      DEFAULT: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
    },

    // Transition durations
    transitionDuration: {
      fast: '150ms',
      DEFAULT: '300ms',  // Primary transition duration
      slow: '500ms',
    },

    // Transition timing functions
    transitionTiming: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
      in: 'cubic-bezier(0.4, 0, 1, 1)',         // ease-in
      out: 'cubic-bezier(0, 0, 0.2, 1)',        // ease-out
      linear: 'linear',
    },
  },

  /**
   * Z-index scale (for layering)
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },
} as const;

/**
 * Type exports for TypeScript usage
 */
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
