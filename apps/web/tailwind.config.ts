import type { Config } from 'tailwindcss';

// Design tokens are the source of truth in DESIGN.md (§18). Palette, radii,
// shadows and motion below mirror that file exactly. Legacy `ink`/`brand`
// aliases are kept so any older references keep compiling during the migration.
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
        sans: ['"IBM Plex Sans Arabic"', '"Tajawal"', '"Cairo"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"IBM Plex Sans Arabic"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // DESIGN.md §3 — ORMS palette
        bg: {
          950: '#07040D',
          900: '#100C1B',
        },
        surface: {
          900: '#151126',
          850: '#1B152D',
          800: '#241B39',
        },
        border: {
          700: '#2F264E',
          600: '#433B5A',
        },
        text: {
          100: '#F4F7FF',
          200: '#D4DBF4',
          400: '#A99AF1',
          500: '#8E88A8',
        },
        primary: {
          400: '#9A68FF',
          500: '#864FF2',
          600: '#6B59E6',
        },
        blue: {
          500: '#5195ED',
        },
        cyan: {
          500: '#36C4F0',
          glow: '#36C4F0',
        },
        success: { 500: '#43F994' },
        warning: { 500: '#FFB35C' },
        danger: { 500: '#FF5C7A' },

        // Legacy aliases (kept for backward compatibility)
        ink: { 950: '#07040D', 900: '#100C1B', 800: '#151126', 700: '#241B39' },
        brand: { 50: '#fdf2ff', 200: '#e9b8ff', 400: '#9A68FF', 500: '#864FF2', 600: '#6B59E6', 700: '#5d28b0' },
      },
      borderRadius: {
        smx: '10px',
        mdx: '16px',
        lgx: '22px',
        xlx: '28px',
        '2xlx': '36px',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(134, 79, 242, 0.18)',
        'glow-cyan': '0 20px 70px rgba(54, 196, 240, 0.12)',
        'btn-primary': '0 16px 40px rgba(134, 79, 242, 0.28)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #864FF2 0%, #6B59E6 42%, #36C4F0 100%)',
        'gradient-text': 'linear-gradient(90deg, #A77BFF 0%, #6B8CFF 45%, #36C4F0 100%)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        shine: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        floatSlow: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
        pulseGlow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        driftGradient: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(3%, -4%) scale(1.08)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        shine: 'shine 1.4s ease',
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'floatSlow 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'drift-gradient': 'driftGradient 12s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(.2,.8,.2,1) both',
        marquee: 'marquee 28s linear infinite',
        'spin-slow': 'spinSlow 4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
