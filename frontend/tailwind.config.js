/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        'flash': 'flash 1s ease-in-out infinite',
      },
      keyframes: {
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        stormops: {
          "primary": "#facc15",          // electric yellow - highlights, active
          "primary-content": "#1e1b0a",  // dark text on yellow
          "secondary": "#38bdf8",        // storm blue - watches, info
          "secondary-content": "#082f49",
          "accent": "#ef4444",           // tornado red - warnings, danger
          "accent-content": "#450a0a",
          "neutral": "#1e293b",          // slate
          "neutral-content": "#cbd5e1",
          "base-100": "#0f172a",         // deep slate/navy background
          "base-200": "#1e293b",         // slightly lighter panels
          "base-300": "#334155",         // borders, dividers
          "base-content": "#e2e8f0",     // light text on dark
          "info": "#38bdf8",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "uppercase",
          "--navbar-height": "4rem",
          "--tab-radius": "0.5rem",
        },
      },
    ],
    darkTheme: "stormops",
  },
}