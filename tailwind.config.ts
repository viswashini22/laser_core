import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#4cc9f0',
        bg: '#030712',
        panel: '#0f172a',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(76,201,240,0.35), 0 0 40px rgba(76,201,240,0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config;
