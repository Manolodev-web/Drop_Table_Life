/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0f1115',
          panel: '#1a1d24',
          border: '#2d313a',
          accent: '#3b82f6',
          text: '#e2e8f0',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}