import { colors, darkVariant, grid, tokensPlugin } from './design/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: darkVariant,
  theme: {
    // Brand-driven semantic palette (see design/tokens.js). Replaces the
    // default palette entirely — no System Blue, no fixed Apple greys.
    colors,

    // 4pt grid: padding, margin, gap and space only accept multiples of 4px.
    // (Width/height keep Tailwind's scale so glyph sizes like h-3.5 still work.)
    padding: grid,
    margin: { auto: 'auto', ...grid },
    gap: grid,
    space: grid,

    // Continuous-curve radii: micro 6–8 · controls 12 · cards 20 · containers 28.
    borderRadius: {
      none: '0px',
      sm: '6px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      '2xl': '20px',
      '3xl': '28px',
      full: '9999px',
    },

    extend: {
      // Bare `border` / `ring` classes resolve to the hairline and the accent
      // (Tailwind would otherwise fall back to a gray we no longer ship).
      borderColor: { DEFAULT: 'rgb(var(--ink) / 0.1)' },
      ringColor: { DEFAULT: 'rgb(var(--accent) / 0.5)' },

      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"SF Pro"',
          '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif',
        ],
        // New York on Apple platforms (ui-serif), Georgia elsewhere.
        serif: ['ui-serif', '"New York"', 'Georgia', 'serif'],
      },

      // HIG type ramp: tracking tightens as size grows, loosens below 13px.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.33', letterSpacing: '0.012em' }], // 11 caption 2
        xs: ['0.75rem', { lineHeight: '1.33', letterSpacing: '0.012em' }], // 12 caption 1
        sm: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0em' }], // 14 footnote/callout
        subhead: ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0em' }], // 15 reading body
        base: ['1rem', { lineHeight: '1.5', letterSpacing: '0em' }], // 16 body
        lg: ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }], // 18 Text→Display hand-off
        xl: ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 20 title 3
        '2xl': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 24 title 2
        '3xl': ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }], // 30 large title
        '4xl': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }], // 36 display
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 1, 0.5, 1)', // snappy spring
        spring: 'cubic-bezier(0.25, 1, 0.5, 1)',
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)', // smooth deceleration
      },
      transitionDuration: { DEFAULT: '300ms' },

      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 1px rgb(var(--shadow) / 0.03)',
        elevated: '0 12px 40px rgb(var(--shadow) / 0.18), 0 2px 6px rgb(var(--shadow) / 0.08)',
        // UISegmentedControl thumb
        segment: '0 3px 8px rgb(0 0 0 / 0.12), 0 3px 1px rgb(0 0 0 / 0.04)',
      },

      backdropBlur: { material: '20px' },
      backdropSaturate: { 180: '1.8' },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'dialog-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in': 'sheet-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'dialog-in': 'dialog-in 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [tokensPlugin],
};
