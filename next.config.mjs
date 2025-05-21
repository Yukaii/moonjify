/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Disable static rendering to avoid issues with browser APIs during prerendering
    appDir: true,
  },
  // Force dynamic rendering for all pages
  reactStrictMode: true,
  swcMinify: true,
}

export default nextConfig