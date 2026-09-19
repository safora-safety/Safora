/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05070D',
          900: '#070A11',
          850: '#0B0F1C',
          800: '#0E1424',
          700: '#172033',
          600: '#23304A',
        },
        safepurple: {
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        emergency: {
          DEFAULT: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.4)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sonar': 'sonarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        sonarPing: {
          '75%, 100%': {
            transform: 'scale(2.2)',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
};
