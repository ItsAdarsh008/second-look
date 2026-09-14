import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { loadCreative } from "./clients/creative";
import { SEVERITIES, type Finding } from "./schema";
import { SEVERITY_LABEL, severityCounts, verdictLine } from "./report";

export const OG_SIZE = { width: 1200, height: 630 };

async function creativeDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const creative = await loadCreative(imageUrl);
    const png = await sharp(creative.bytes).resize({ height: 630, fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The share card: the creative beside the severity count, which is what makes people click. */
export async function renderReportCard(opts: { imageUrl: string; title: string; findings: readonly Finding[] | null; kicker: string }) {
  const image = await creativeDataUrl(opts.imageUrl);
  const counts = opts.findings ? severityCounts(opts.findings) : null;
  const critical = counts ? counts.critical > 0 : false;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f3f4f1", color: "#17191c" }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img
          <img src={image} alt="" style={{ height: 630, width: 504, objectFit: "cover", borderRight: "2px solid #17191c" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 60px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#4a4f57" }}>{opts.kicker}</div>
            <div style={{ fontSize: 58, lineHeight: 1.05, marginTop: 14, letterSpacing: -1 }}>{opts.title}</div>
          </div>
          {counts && opts.findings ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, color: critical ? "#8c1d1d" : "#17191c", marginBottom: 24 }}>{verdictLine(opts.findings)}</div>
              <div style={{ display: "flex", gap: 40 }}>
                {SEVERITIES.map((s) => (
                  <div key={s} style={{ display: "flex", flexDirection: "column", color: counts[s] === 0 ? "#9aa0a8" : s === "critical" ? "#8c1d1d" : "#17191c" }}>
                    <div style={{ fontSize: 22 }}>{SEVERITY_LABEL[s]}</div>
                    <div style={{ fontSize: 72, lineHeight: 1 }}>{counts[s]}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 30, color: "#4a4f57" }}>A cultural pre-flight check for ad campaigns</div>
          )}
          <div style={{ fontSize: 24, color: "#2750b8" }}>Second Look</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
