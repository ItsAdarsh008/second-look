import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Schibsted_Grotesk } from "next/font/google";
import { MotionProviders } from "@/components/motion/providers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  // Only the Magic Hour request panel uses mono; don't spend first-load bytes on it.
  preload: false,
});

// Link previews are fetched by crawlers, so production share images must point at the public domain.
// VERCEL_URL is the per-deployment URL, which Vercel's deployment protection hides from them.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Second Look: know what your ad means before it launches",
    template: "%s | Second Look",
  },
  description:
    "Cultural risk review for ad campaigns. Checks the creative, product name, copy and launch date against each market's history, language and calendar, cites the precedent behind every flag, and drafts alternative creative with the Magic Hour API.",
  openGraph: { siteName: "Second Look", type: "website" },
  // X shows the large image card only when asked; it falls back to og:image for the picture.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d22" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${schibsted.variable} ${plexMono.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-sheet focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <MotionProviders>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </MotionProviders>
      </body>
    </html>
  );
}
