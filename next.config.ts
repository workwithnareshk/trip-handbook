import type { NextConfig } from "next";

// Static export so the whole app can be hosted on any static host (e.g.
// GitHub Pages) and cached by the service worker for offline use.
// Set NEXT_PUBLIC_BASE_PATH (e.g. "/kerala-trip-handbook") when hosting
// under a sub-path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
