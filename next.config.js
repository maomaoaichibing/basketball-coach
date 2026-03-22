/** @type {import('next').NextConfig} */
const nextConfig = {
  // 确保 Tailwind CSS 正确工作
  experimental: {
    optimizeCss: false,
  },
  // 确保正确处理 CSS
  webpack: (config) => {
    return config
  },
}

module.exports = nextConfig
