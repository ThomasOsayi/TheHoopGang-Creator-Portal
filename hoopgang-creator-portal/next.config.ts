import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  
  // For API routes, we need to disable the body parser 
  // and handle it manually in the route (you're already doing this with FormData)
  // But we should also set a longer timeout
  serverExternalPackages: [],
};

export default nextConfig;