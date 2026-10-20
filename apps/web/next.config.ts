import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide only the development route inspector shown in the browser corner.
  // Build and runtime error overlays remain enabled.
  devIndicators: false,
};

export default nextConfig;
