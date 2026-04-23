/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  generateBuildId: async () => {
    // Force new build ID to invalidate cache
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
