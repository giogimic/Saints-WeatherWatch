/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fredoka', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
        display: ['Outfit', 'sans-serif'],
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
          "primary": "#00e5ff",          // Neon Cyan (slurp juice)
          "primary-content": "#001a1d",
          "secondary": "#ff007f",        // Hot Pink
          "secondary-content": "#4d0026",
          "accent": "#ffea00",           // Loot-tier Gold/Yellow
          "accent-content": "#4d4600",
          "neutral": "#1a1025",          // Deep gaming purple
          "neutral-content": "#e0d4f5",
          "base-100": "#1a1025",         // Background
          "base-200": "#2b1b3d",         // Panels
          "base-300": "#452c63",         // Borders
          "base-content": "#ffffff",     // Text
          "info": "#00e5ff",
          "success": "#39ff14",          // Neon green
          "warning": "#ff9900",
          "error": "#ff003c",            // Vivid red
          "--rounded-box": "1.5rem",
          "--rounded-btn": "1rem",
          "--rounded-badge": "1.5rem",
          "--animation-btn": "0.15s",
          "--animation-input": "0.15s",
          "--btn-text-case": "uppercase",
          "--navbar-height": "4.5rem",
          "--tab-radius": "1rem",
        },
      },
    ],
    darkTheme: "stormops",
  },
}