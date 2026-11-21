import typography from '@tailwindcss/typography';

/**
 * Palette taken from the Sonxai (SXS) logo: lapis ring, magenta inner ring, the green and
 * orange children and the blue/green/magenta page edges of the open book.
 */
const lapis = {
  50: '#EEF2FB',
  100: '#DCE4F7',
  200: '#B7C6EE',
  300: '#8FA5E2',
  500: '#3355C4',
  600: '#2443A8',
  700: '#1F3A93',
  800: '#192F78',
  900: '#14265F',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Admin panel (tool UI)
        sans: ['Inter', 'Noto Sans Lao', 'sans-serif'],
        // Public website: Andika (SIL, designed for beginning readers) + Lao
        school: ['Andika', 'Noto Sans Lao', 'sans-serif'],
        // Headings: looped Lao, the style children learn from in schoolbooks
        display: ['Andika', 'Noto Sans Lao Looped', 'Noto Sans Lao', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#18204F', soft: '#3A4270', muted: '#5D6488' },
        lapis,
        // `brand` drives the admin panel; it now follows the school's lapis blue.
        brand: { ...lapis, dark: '#121A4A' },
        hibiscus: { 50: '#FCEEF5', 300: '#F49AC8', 500: '#D02A8A', 600: '#C2187A', 700: '#9E1263' },
        leaf: { 50: '#EEF8EC', 300: '#9BD88F', 500: '#4CAF3F', 600: '#3E9B3A', 700: '#2F7E2C' },
        marigold: { 50: '#FEF4E6', 300: '#FBBF6B', 400: '#F6A13A', 500: '#EE8A1E', 600: '#D2700B', 700: '#A9580A' },
        rule: '#C9D3EE',
        mist: '#F3F5FB',
        amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
      },
      keyframes: {
        // Flashcards being dealt onto the board (rotation comes from --r on each card)
        deal: {
          '0%': { opacity: '0', transform: 'translateY(36px) rotate(0deg) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(var(--r)) scale(1)' },
        },
      },
      animation: {
        deal: 'deal 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [typography],
};
