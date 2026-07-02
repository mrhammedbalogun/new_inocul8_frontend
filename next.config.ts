import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.inocul8.com.ng", pathname: "/media/**" },
    ],
  },
};

export default nextConfig;
