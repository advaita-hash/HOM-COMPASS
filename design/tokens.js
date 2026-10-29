// ---------------------------------------------------------------------------
// HOM-COMPASS design tokens — Apple HIG semantic layers, driven by the brand.
//
// Six brand anchors per theme (base, surface, elevated, ink, accent, on-accent)
// generate every colour the app uses. Each Tailwind palette shade becomes a CSS
// variable whose value switches with `prefers-color-scheme`, so existing
// classes (`text-slate-500`, `bg-brand-50`, `bg-red-50`) re-skin automatically
// and gain a dark mode without per-component edits.
//
//   • slate  → the brand ink blended over the surface at Apple's label/fill
//              opacities (90 / 60 / 30 % text, 10 % hairlines, 3–6 % fills).
//   • brand  → light: the original pine scale; dark: accent tints over the
//              deep-green surface for fills, lifted pines for text.
//   • hues   → (reds for destructive, ambers for highlights, …) keep Tailwind's
//              light values; in dark their tints become low-alpha washes and
//              their text shades lighten so they stay legible.
//   • grade  → repertory grade 1–4 data colours, lifted in dark for contrast.
//
// Change the anchors below to re-theme the entire app.
// ---------------------------------------------------------------------------

import defaultColors from 'tailwindcss/colors.js';
import plugin from 'tailwindcss/plugin.js';

export const LIGHT = {
  base: '#f4f9f8', // grouped background, brand-50 tinted off-white
  surface: '#ffffff', // cards
  elevated: '#ffffff', // sheets, popovers
  ink: '#0f2420', // text + hairline base, deepest brand green
  accent: '#26665c', // brand primary (replaces System Blue)
  accentHover: '#20524b',
  onAccent: '#ffffff',
  shadow: '#0f2420',
  dim: [15, 36, 32, 0.32], // modal backdrop
};

export const DARK = {
  base: '#0c1d1a', // deep brand green for OLED depth
  surface: '#142b27',
  elevated: '#1c3a35',
  ink: '#eaf4f1',
  accent: '#4e9c8e', // lifted pine: 4.6:1 as text on the dark surface
  accentHover: '#62ad9f',
  onAccent: '#0c1d1a', // dark label on the lifted fill (5.4:1)
  shadow: '#000000',
  dim: [0, 0, 0, 0.6],
};

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HUES = ['red', 'amber', 'emerald', 'violet', 'blue', 'teal', 'indigo', 'pink'];

/** Ink opacity per slate shade (Apple label / separator / fill levels). */
const INK_ALPHA = {
  50: 0.035, // grouped fill
  100: 0.06, // fill (hover, chips)
  200: 0.1, // hairline separator
  300: 0.3, // tertiary label
  400: 0.45, // placeholder / muted caption
  500: 0.6, // secondary label
  600: 0.72,
  700: 0.82,
  800: 0.9, // primary label
  900: 0.95,
  950: 0.98,
};

const BRAND_LIGHT = {
  50: '#eef6f4', 100: '#d6ebe6', 200: '#aed7ce', 300: '#7cbcb0', 400: '#4e9c8e',
  500: '#337f72', 600: '#26665c', 700: '#20524b', 800: '#1c423d', 900: '#183833', 950: '#0f2420',
};

const GRADE = {
  // light: every grade ≥ 4.5:1 on surface, base and slate-50 fills (grade 1 stays
  // visibly lighter than primary text so "plain" still reads as the lowest grade)
  light: { 1: '#5f6e82', 2: '#2563eb', 3: '#7c3aed', 4: '#dc2626' },
  dark: { 1: '#94a3b8', 2: '#60a5fa', 3: '#a78bfa', 4: '#f87171' },
};

// ---- colour maths ---------------------------------------------------------
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** fg over bg at opacity a, as a solid colour (keeps Tailwind `/alpha` usable). */
const mix = (fg, bg, a) => {
  const f = rgb(fg);
  const b = rgb(bg);
  return f.map((c, i) => Math.round(b[i] + (c - b[i]) * a));
};
const triplet = (v) => (Array.isArray(v) ? v : rgb(v)).join(' ');

function themeVars(T, dark) {
  const vars = {
    'color-scheme': dark ? 'dark' : 'light',
    '--bg-base': triplet(T.base),
    '--bg-surface': triplet(T.surface),
    '--bg-elevated': triplet(T.elevated),
    '--ink': triplet(T.ink),
    '--accent': triplet(T.accent),
    '--accent-hover': triplet(T.accentHover),
    '--on-accent': triplet(T.onAccent),
    '--shadow': triplet(T.shadow),
    '--dim': `rgb(${T.dim.slice(0, 3).join(' ')} / ${T.dim[3]})`,
    // segmented-control thumb: white in light, a lifted ink grey in dark
    '--seg-thumb': triplet(dark ? mix(T.ink, T.surface, 0.3) : T.elevated),
  };
  for (const s of SHADES) vars[`--c-slate-${s}`] = triplet(mix(T.ink, T.surface, INK_ALPHA[s]));

  const brandDark = {
    50: mix(T.accent, T.surface, 0.14), 100: mix(T.accent, T.surface, 0.2),
    200: mix(T.accent, T.surface, 0.3), 300: mix(T.accent, T.surface, 0.45),
    400: mix(T.accent, T.surface, 0.65), 500: mix(T.accent, T.surface, 0.85),
    600: T.accent, 700: '#7cbcb0', 800: '#aed7ce', 900: '#d6ebe6', 950: '#eef6f4',
  };
  for (const s of SHADES) vars[`--c-brand-${s}`] = triplet(dark ? brandDark[s] : BRAND_LIGHT[s]);

  for (const h of HUES) {
    const c = defaultColors[h];
    const darkMap = {
      50: mix(c[500], T.surface, 0.16), 100: mix(c[500], T.surface, 0.22),
      200: mix(c[500], T.surface, 0.32), 300: mix(c[500], T.surface, 0.48),
      400: c[400], 500: c[400], 600: c[400], 700: c[300], 800: c[200], 900: c[100], 950: c[50],
    };
    for (const s of SHADES) vars[`--c-${h}-${s}`] = triplet(dark ? darkMap[s] : c[s]);
  }

  const g = dark ? GRADE.dark : GRADE.light;
  for (const k of [1, 2, 3, 4]) vars[`--c-grade-${k}`] = triplet(g[k]);
  return vars;
}

// ---- Tailwind wiring ------------------------------------------------------
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name) => Object.fromEntries(SHADES.map((s) => [s, v(`c-${name}-${s}`)]));

export const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  inherit: 'inherit',
  white: '#ffffff',
  black: '#000000',
  slate: scale('slate'),
  brand: scale('brand'),
  ...Object.fromEntries(HUES.map((h) => [h, scale(h)])),
  grade: { 1: v('c-grade-1'), 2: v('c-grade-2'), 3: v('c-grade-3'), 4: v('c-grade-4') },
  // semantic layers (use these in new code)
  // the grouped background is `canvas` (bg-canvas), not `base`: a colour named
  // `base` would make the `text-base` font size also set the text colour
  canvas: v('bg-base'),
  surface: v('bg-surface'),
  elevated: v('bg-elevated'),
  ink: v('ink'), // text-ink/90 · text-ink/60 · text-ink/30 · border-ink/10
  accent: { DEFAULT: v('accent'), hover: v('accent-hover') },
  'on-accent': v('on-accent'),
  thumb: v('seg-thumb'),
  // fixed artwork colours — identical in light and dark (covers, heroes)
  art: {
    pine: '#26665c', sea: '#337f72', teal: '#0d9488', emerald: '#10b981',
    indigo: '#4f46e5', violet: '#8b5cf6', amber: '#b45309', rose: '#be4b49',
  },
};

/** 4pt grid: the only values padding, margin, gap and space may take. */
const GRID_STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
export const grid = {
  px: '1px',
  ...Object.fromEntries(GRID_STEPS.map((k) => [k, k === 0 ? '0px' : `${k * 0.25}rem`])),
};

/**
 * Appearance: Auto follows the system; a manual choice is stored as
 * <html data-theme="light|dark"> and wins over the system setting.
 */
export const tokensPlugin = plugin(({ addBase }) => {
  addBase({
    ':root': themeVars(LIGHT, false),
    '@media (prefers-color-scheme: dark)': {
      ':root:not([data-theme="light"])': themeVars(DARK, true),
    },
    ':root[data-theme="dark"]': themeVars(DARK, true),
  });
});

/** `dark:` variant that honours both the system setting and the manual override. */
export const darkVariant = [
  'variant',
  [
    '@media (prefers-color-scheme: dark) { &:not([data-theme="light"] *) }',
    '&:is([data-theme="dark"] *)',
  ],
];
