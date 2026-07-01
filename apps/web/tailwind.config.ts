import type { Config } from 'tailwindcss';

// Ported from frontend/tailwind.config.js. Palette/animation preserved so the
// existing DESIGN.md styling and inline styles keep working unchanged.
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', '"Cairo"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#08060f',
          900: '#0f0d1c',
          800: '#1a1729',
          700: '#272238',
        },
        brand: {
          50: '#fdf2ff',
          200: '#e9b8ff',
          400: '#b76cff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#5d28b0',
        },
        cyan: {
          glow: '#22d3ee',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(124,58,237,0.35)',
        'glow-cyan': '0 0 40px rgba(34,211,238,0.25)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseBorder: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(124,58,237,0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        float: 'float 4s ease-in-out infinite',
        pulseBorder: 'pulseBorder 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
