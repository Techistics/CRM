import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-8616c20c9cae442a8b45274fa481a1ea.r2.dev',
      },
    ],
  },
}
export default nextConfig