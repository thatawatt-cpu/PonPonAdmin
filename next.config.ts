import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "image.zort.co.th",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
