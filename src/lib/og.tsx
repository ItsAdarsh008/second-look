import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { loadCreative } from "./clients/creative";
import { SEVERITIES, type Finding } from "./schema";
import { SEVERITY_LABEL, severityCounts, verdictLine } from "./report";

export const OG_SIZE = { width: 1200, height: 630 };

type OgFonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const FONT_DIR = path.join(process.cwd(), "src", "lib", "fonts");
let fonts: Promise<OgFonts> | null = null;

/** The site's two faces: Schibsted Grotesk for text, Instrument Serif for display. Read once per server instance. */
function ogFonts(): Promise<OgFonts> {
  // Static instances: the renderer can't read variable fonts.
  const read = (file: string) => readFile(path.join(FONT_DIR, file));
  fonts ??= Promise.all([read("SchibstedGrotesk-400.woff"), read("SchibstedGrotesk-600.woff"), read("InstrumentSerif-Regular.ttf")]).then(([sans, sansBold, serif]) => [
    { name: SANS, data: sans, weight: 400, style: "normal" },
    { name: SANS, data: sansBold, weight: 600, style: "normal" },
    { name: SERIF, data: serif, weight: 400, style: "normal" },
  ]);
  return fonts;
}

const SANS = "Schibsted Grotesk";
const SERIF = "Instrument Serif";
const C = {
  paper: "#f3f4f1",
  ink: "#17191c",
  ink2: "#4a4f57",
  ink3: "#646a73",
  rule: "#d6d9d3",
  pencil: "#2750b8",
  critical: "#8c1d1d",
  table: "#1c1f24",
  tableRule: "#353a42",
  tableDim: "#939aa3",
} as const;

async function creativeDataUrl(imageUrl: string, height = 630): Promise<string | null> {
  try {
    const creative = await loadCreative(imageUrl);
    const png = await sharp(creative.bytes).resize({ height, fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Registration marks at the corners of the sheet, as on the light table. */
function CropMark({ x, y }: { x: "left" | "right"; y: "top" | "bottom" }) {
  const arm = { position: "absolute", background: C.tableDim } as const;
  return (
    <div style={{ position: "absolute", display: "flex", width: 22, height: 22, [x]: -34, [y]: -34 }}>
      <div style={{ ...arm, height: 2, width: 18, [y]: 10, [x === "left" ? "right" : "left"]: 0 }} />
      <div style={{ ...arm, width: 2, height: 18, [x]: 10, [y === "top" ? "bottom" : "top"]: 0 }} />
    </div>
  );
}

/**
 * The site-wide share card: an ad on the light table with its finding boxed in blue
 * pencil, beside the promise and the finding itself. Specific, like every finding.
 */
export async function renderHomeCard() {
  const [image, fontData] = await Promise.all([creativeDataUrl("/cases/rising-sun-rays.png", 750), ogFonts()]);
  const img = { w: 296, h: 370 };
  // The sunrise, as normalized in the spot-the-problem answer key.
  const box = { x: 0.139 * img.w, y: 0.104 * img.h, w: 0.722 * img.w, h: 0.563 * img.h };

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.paper, color: C.ink, fontFamily: SANS }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "54px 56px 52px 64px" }}>
          <div style={{ fontFamily: SERIF, fontSize: 38, letterSpacing: -0.5 }}>Second Look</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: SERIF, fontSize: 78, lineHeight: 1, letterSpacing: -1.5 }}>Know what your ad means before it launches.</div>
            <div style={{ fontSize: 25, color: C.ink2, marginTop: 22, lineHeight: 1.35 }}>
              Cultural risk review for the picture, the name, the copy and the launch date, market by market.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", borderLeft: `4px solid ${C.pencil}`, paddingLeft: 20 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: C.pencil }}>Finding 1, high risk in South Korea and China</div>
              <div style={{ fontSize: 24, color: C.ink, marginTop: 6, lineHeight: 1.3 }}>The sunrise reads as the Rising Sun flag.</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", width: 430, height: "100%", background: C.table, alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.ink}` }}>
          <div style={{ position: "relative", display: "flex", width: img.w, height: img.h, boxShadow: `0 0 0 1px ${C.tableRule}` }}>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img
              <img src={image} alt="" width={img.w} height={img.h} style={{ width: img.w, height: img.h }} />
            )}
            <div
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                border: `4px solid ${C.pencil}`,
                borderRadius: 4,
                boxShadow: "0 0 0 2px #fbfbf9, inset 0 0 0 2px #fbfbf9",
                background: "rgba(39, 80, 184, 0.10)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.pencil,
                color: "#fbfbf9",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              1
            </div>
            <CropMark x="left" y="top" />
            <CropMark x="right" y="top" />
            <CropMark x="left" y="bottom" />
            <CropMark x="right" y="bottom" />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fontData },
  );
}

/** The share card for a report or case: the creative beside the severity count, which is what makes people click. */
export async function renderReportCard(opts: { imageUrl: string; title: string; findings: readonly Finding[] | null; kicker: string }) {
  const [image, fontData] = await Promise.all([creativeDataUrl(opts.imageUrl), ogFonts()]);
  const counts = opts.findings ? severityCounts(opts.findings) : null;
  const critical = counts ? counts.critical > 0 : false;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.paper, color: C.ink, fontFamily: SANS }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img
          <img src={image} alt="" style={{ height: 630, width: 504, objectFit: "cover", borderRight: `2px solid ${C.ink}` }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 60px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: C.ink2 }}>{opts.kicker}</div>
            <div style={{ fontFamily: SERIF, fontSize: 72, lineHeight: 1, marginTop: 14, letterSpacing: -1 }}>{opts.title}</div>
          </div>
          {counts && opts.findings ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Satori needs an explicit display on every node it lays out, text ones included. */}
              <div style={{ display: "flex", fontSize: 30, color: critical ? C.critical : C.ink, marginBottom: 24 }}>{verdictLine(opts.findings)}</div>
              <div style={{ display: "flex", gap: 40 }}>
                {SEVERITIES.map((s) => (
                  <div key={s} style={{ display: "flex", flexDirection: "column", color: counts[s] === 0 ? "#9aa0a8" : s === "critical" ? C.critical : C.ink }}>
                    <div style={{ display: "flex", fontSize: 22 }}>{SEVERITY_LABEL[s]}</div>
                    <div style={{ display: "flex", fontSize: 72, lineHeight: 1 }}>{String(counts[s])}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 30, color: C.ink2 }}>A cultural pre-flight check for ad campaigns</div>
          )}
          <div style={{ fontFamily: SERIF, fontSize: 34, color: C.pencil }}>Second Look</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fontData },
  );
}
