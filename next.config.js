/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com', 'example.com'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
