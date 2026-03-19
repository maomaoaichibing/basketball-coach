/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ab',
          300: '#f5b876',
          400: '#f08f3e',
          500: '#e97116',
          600: '#d3540b',
          700: '#ae3f0a',
          800: '#8c3310',
          900: '#722c10',
        },
      },
    },
  },
  plugins: [],
}
