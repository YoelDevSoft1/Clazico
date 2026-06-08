import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yoeldevsoft25/storefront-sdk", "@yoeldevsoft25/store-contracts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
};

export default nextConfig;
