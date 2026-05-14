/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone output in production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  generateBuildId: async () => {
    // Force new build ID to invalidate cache
    return `build-${Date.now()}`;
  },
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to silence the warning
    // Turbopack handles hot reload automatically
  },
  
  // Webpack config for when using --webpack flag
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable hot module replacement
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
