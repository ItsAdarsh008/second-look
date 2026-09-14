import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
  },
  // Route handlers read case creative from disk to send it to Claude and Magic Hour.
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/cases/*.png"],
    "/api/generate": ["./public/cases/*.png"],
    "/a/[id]/opengraph-image": ["./public/cases/*.png"],
    "/cases/[slug]/opengraph-image": ["./public/cases/*.png"],
  },
  serverExternalPackages: ["sharp"],
  poweredByHeader: false,
};

export default nextConfig;
