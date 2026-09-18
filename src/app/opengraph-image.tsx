import { OG_SIZE, renderHomeCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Second Look: an ad on a light table with the risk in its picture boxed in blue pencil";

export default function Image() {
  return renderHomeCard();
}
