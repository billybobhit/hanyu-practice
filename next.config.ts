import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist needs to be transpiled
  transpilePackages: [],
  // Allow fetching external content for URL extraction
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
