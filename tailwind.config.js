/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1a2b16',
          dark: '#0f2e1a',
          mid: '#243828',
          light: '#3d5a35',
        },
        moss: {
          DEFAULT: '#657e50',
          light: '#7a9464',
          dark: '#4f6540',
          accent: '#657e50',
        },
        sage: '#56ab7a',
        cream: '#faf9f6',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        merry: ['var(--font-merry)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 30px rgba(27, 48, 34, 0.08)',
      },
    },
  },
  plugins: [],
};
