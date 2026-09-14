/**
 * Renders the synthetic case-study creative.
 *
 *   npx tsx scripts/render-creative.ts        (run from the repo root)
 *
 * Reads every `fixtures/creative/<slug>.svg` and writes:
 *   - public/cases/<slug>.png        1080×1350 (4:5), the image the analyzer sees
 *   - public/cases/<slug>-thumb.png  540×675, for gallery cards
 * and copies the `rising-sun-rays` render to `fixtures/test.png` for the
 * Magic Hour smoke test.
 *
 * All creative is synthetic, drawn for this project with fictional brands.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CREATIVE_DIR = path.join("fixtures", "creative");
const OUT_DIR = path.join("public", "cases");
const SMOKE_TEST_SLUG = "rising-sun-rays";
const SMOKE_TEST_PATH = path.join("fixtures", "test.png");

const FULL = { width: 1080, height: 1350 } as const;
const THUMB = { width: 540, height: 675 } as const;

/** Rasterize at 2× and downsample, which gives cleaner edges than a 1× render. */
const RENDER_DENSITY = 144;

const SLUG_RE = /^[a-z0-9-]+$/;

async function renderOne(slug: string): Promise<void> {
  const source = path.join(CREATIVE_DIR, `${slug}.svg`);
  const fullPath = path.join(OUT_DIR, `${slug}.png`);
  const thumbPath = path.join(OUT_DIR, `${slug}-thumb.png`);

  const meta = await sharp(source).metadata();
  if (meta.width !== FULL.width || meta.height !== FULL.height) {
    throw new Error(
      `${source} is ${meta.width}×${meta.height}; expected ${FULL.width}×${FULL.height}`,
    );
  }

  const png = await sharp(source, { density: RENDER_DENSITY })
    .resize(FULL.width, FULL.height, { fit: "fill", kernel: "lanczos3" })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(png).toFile(fullPath);
  await sharp(png)
    .resize(THUMB.width, THUMB.height, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(thumbPath);

  console.log(`  ${slug.padEnd(34)} → ${fullPath}, ${thumbPath}`);
}

async function main(): Promise<void> {
  if (!existsSync(CREATIVE_DIR)) {
    throw new Error(`No ${CREATIVE_DIR} directory — run this from the repo root.`);
  }

  const slugs = readdirSync(CREATIVE_DIR)
    .filter((f) => f.toLowerCase().endsWith(".svg"))
    .map((f) => path.basename(f, path.extname(f)))
    .sort();

  if (slugs.length === 0) throw new Error(`No SVG files in ${CREATIVE_DIR}`);

  const bad = slugs.filter((s) => !SLUG_RE.test(s));
  if (bad.length > 0) throw new Error(`Invalid slug file names: ${bad.join(", ")}`);

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Rendering ${slugs.length} creative file(s):`);
  for (const slug of slugs) await renderOne(slug);

  if (slugs.includes(SMOKE_TEST_SLUG)) {
    copyFileSync(path.join(OUT_DIR, `${SMOKE_TEST_SLUG}.png`), SMOKE_TEST_PATH);
    console.log(`  copied ${SMOKE_TEST_SLUG}.png → ${SMOKE_TEST_PATH}`);
  } else {
    console.warn(`  warning: ${SMOKE_TEST_SLUG}.svg not found; ${SMOKE_TEST_PATH} not written`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
