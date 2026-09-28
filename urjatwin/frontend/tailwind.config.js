/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0a1628', 800: '#0f2044', 700: '#1a3a6b', 600: '#1e4080' },
        teal: { 500: '#0d9488', 400: '#14b8a6', 300: '#5eead4' },
        status: {
          good: '#16a34a',
          warning: '#d97706',
          critical: '#dc2626',
          unknown: '#6b7280'
        }
      }
    },
  },
  plugins: [],
}
