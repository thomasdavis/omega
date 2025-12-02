import type { Config } from 'tailwindcss';
import { tokens } from './tokens.js';

/**
 * Omega UI Tailwind Preset
 *
 * This preset applies the Omega design system tokens to Tailwind CSS.
 * Import this in your app's tailwind.config.ts to use the design system.
 *
 * @example
 * ```ts
 * // apps/web/tailwind.config.ts
 * import uiPreset from '@repo/ui/tailwind-preset';
 *
 * export default {
 *   presets: [uiPreset],
 *   content: [
 *     './app/**.{js,ts,jsx,tsx}',
 *     '../../packages/ui/src/**.{js,ts,jsx,tsx}'
 *   ]
 * };
 * ```
 */
const preset: Partial<Config> = {
  darkMode: ['class'],
  theme: {
    extend: {
      /**
       * Colors from design tokens
       */
      colors: {
        // Background colors
        'zinc-950': tokens.colors.background.primary,
        'zinc-900': tokens.colors.background.secondary,
        'zinc-800': tokens.colors.background.tertiary,
        'zinc-700': tokens.colors.border.subtle,
        'zinc-600': tokens.colors.text.muted,
        'zinc-500': tokens.colors.text.tertiary,
        'zinc-400': tokens.colors.text.secondary,
        white: tokens.colors.text.primary,

        // Primary accent (teal)
        'teal-400': tokens.colors.primary.light,
        'teal-500': tokens.colors.primary.DEFAULT,
        'teal-600': tokens.colors.primary.dark,

        // Semantic colors
        'green-400': tokens.colors.semantic.success,
        'red-400': tokens.colors.semantic.error,
        'amber-400': tokens.colors.semantic.warning,
        'blue-400': tokens.colors.semantic.info,

        // Secondary accents
        'purple-400': tokens.colors.accents.purple,
        'orange-600': tokens.colors.accents.orange,

        // Semantic aliases for easier use
        background: {
          DEFAULT: tokens.colors.background.primary,
          secondary: tokens.colors.background.secondary,
          tertiary: tokens.colors.background.tertiary,
        },
        foreground: tokens.colors.text.primary,
        primary: {
          DEFAULT: tokens.colors.primary.DEFAULT,
          foreground: tokens.colors.text.primary,
        },
        border: {
          DEFAULT: tokens.colors.border.DEFAULT,
          subtle: tokens.colors.border.subtle,
        },
      },

      /**
       * Typography
       */
      fontFamily: {
        sans: tokens.typography.fontFamily.sans.split(', '),
        mono: tokens.typography.fontFamily.mono.split(', '),
      },
      fontSize: {
        xs: [tokens.typography.fontSize.xs.size, { lineHeight: tokens.typography.fontSize.xs.lineHeight }],
        sm: [tokens.typography.fontSize.sm.size, { lineHeight: tokens.typography.fontSize.sm.lineHeight }],
        base: [tokens.typography.fontSize.base.size, { lineHeight: tokens.typography.fontSize.base.lineHeight }],
        lg: [tokens.typography.fontSize.lg.size, { lineHeight: tokens.typography.fontSize.lg.lineHeight }],
        xl: [tokens.typography.fontSize.xl.size, { lineHeight: tokens.typography.fontSize.xl.lineHeight }],
        '2xl': [tokens.typography.fontSize['2xl'].size, { lineHeight: tokens.typography.fontSize['2xl'].lineHeight }],
        '3xl': [tokens.typography.fontSize['3xl'].size, { lineHeight: tokens.typography.fontSize['3xl'].lineHeight }],
        '4xl': [tokens.typography.fontSize['4xl'].size, { lineHeight: tokens.typography.fontSize['4xl'].lineHeight }],
        '5xl': [tokens.typography.fontSize['5xl'].size, { lineHeight: tokens.typography.fontSize['5xl'].lineHeight }],
      },
      fontWeight: {
        light: tokens.typography.fontWeight.light,
        normal: tokens.typography.fontWeight.normal,
        medium: tokens.typography.fontWeight.medium,
        semibold: tokens.typography.fontWeight.semibold,
        bold: tokens.typography.fontWeight.bold,
      },
      letterSpacing: {
        tighter: tokens.typography.letterSpacing.tighter,
        tight: tokens.typography.letterSpacing.tight,
        normal: tokens.typography.letterSpacing.normal,
        wide: tokens.typography.letterSpacing.wide,
        wider: tokens.typography.letterSpacing.wider,
        widest: tokens.typography.letterSpacing.widest,
      },

      /**
       * Spacing
       */
      spacing: tokens.spacing,

      /**
       * Layout
       */
      maxWidth: tokens.layout.maxWidth,

      /**
       * Border radius
       */
      borderRadius: tokens.effects.borderRadius,

      /**
       * Box shadows
       */
      boxShadow: tokens.effects.boxShadow,

      /**
       * Backdrop blur
       */
      backdropBlur: tokens.effects.backdropBlur,

      /**
       * Transitions
       */
      transitionDuration: tokens.effects.transitionDuration,
      transitionTimingFunction: {
        DEFAULT: tokens.effects.transitionTiming.DEFAULT,
        in: tokens.effects.transitionTiming.in,
        out: tokens.effects.transitionTiming.out,
        linear: tokens.effects.transitionTiming.linear,
      },

      /**
       * Z-index
       */
      zIndex: tokens.zIndex,

      /**
       * Animations (Geist-inspired)
       */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 300ms ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 300ms ease-out',
        'slide-in-from-left': 'slide-in-from-left 300ms ease-out',
        'slide-in-from-right': 'slide-in-from-right 300ms ease-out',
      },
    },
  },
};

export default preset;
