import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize jsdom so Vercel does not attempt to bundle its native dependencies
  serverExternalPackages: ['jsdom'],
};

export default nextConfig;
