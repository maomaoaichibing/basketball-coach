/** @type {import('tailwindcss').Config} */
export default {
  // 确保所有内容路径都被扫描
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // 确保 Tailwind CSS 正确工作
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
  // 禁用某些可能引起问题的优化
  corePlugins: {
    preflight: true,
  },
}
