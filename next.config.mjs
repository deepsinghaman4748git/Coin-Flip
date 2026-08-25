/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // Disables build failure on ESLint issues during Vercel deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disables build failure on TypeScript checking during Vercel deployment
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

