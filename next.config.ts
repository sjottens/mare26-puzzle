import type { NextConfig } from "next";

// Pure static export: no API routes, no middleware, no server-only features.
// This keeps the app wrappable with Capacitor later (webDir = "out").
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
