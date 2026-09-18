import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
  },
  // Route handlers read case creative from disk to send it to Claude and Magic Hour; share cards also read the fonts.
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/cases/*.png"],
    "/api/generate": ["./public/cases/*.png"],
    "/opengraph-image": ["./public/cases/*.png", "./src/lib/fonts/*"],
    "/a/[id]/opengraph-image": ["./public/cases/*.png", "./src/lib/fonts/*"],
    "/cases/[slug]/opengraph-image": ["./public/cases/*.png", "./src/lib/fonts/*"],
  },
  serverExternalPackages: ["sharp"],
  poweredByHeader: false,
};

export default nextConfig;
