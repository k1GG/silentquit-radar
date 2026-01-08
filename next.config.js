/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false,
  },
  turbopack: {
    root: process.cwd(),
  },
}

module.exports = nextConfig