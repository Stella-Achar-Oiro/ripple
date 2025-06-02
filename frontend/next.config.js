/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Ensure React 19 compatibility
  reactStrictMode: true,
}

module.exports = nextConfig
