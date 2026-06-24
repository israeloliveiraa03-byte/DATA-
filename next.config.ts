import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
    ],
  },
  transpilePackages: ["leaflet", "react-leaflet"],
};

export default nextConfig;
