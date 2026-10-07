/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        mono: ["'Space Grotesk'", 'monospace'],
      },
      colors: {
        lime:   '#82e66f',
        pink:   '#f364cb',
        cyan:   '#78dbf6',
        yellow: '#ffd23f',
        grid:   '#e1e1d8',
        base:   '#f3f3ed',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '9999px',
      },
      boxShadow: {
        brutal: '5px 5px 0px #000000',
        'brutal-sm': '3px 3px 0px #000000',
        'brutal-xs': '2px 2px 0px #000000',
      },
    },
  },
  plugins: [],
};
