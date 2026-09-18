import { CREATIVE_VERSIONS } from "./creative-versions";

/**
 * URL of a case's rendered creative, versioned by its content hash. The file keeps its
 * name (the analyzer and old reports read `/cases/<slug>.png`), but a redraw changes the
 * URL, so no browser, image optimizer or CDN keeps serving the old picture.
 */
export function creativeUrl(slug: string, size: "full" | "thumb" = "full"): string {
  const version = CREATIVE_VERSIONS[slug];
  return `/cases/${slug}${size === "thumb" ? "-thumb" : ""}.png${version ? `?v=${version}` : ""}`;
}
