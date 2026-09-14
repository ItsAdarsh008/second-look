import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MagicHourError,
  __setFetch,
  buildEditRequestBody,
  editImage,
  getImageProject,
  getUploadUrl,
  pollUntilComplete,
} from "./magicHour";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("magicHour client", () => {
  const calls: { url: string; init?: RequestInit }[] = [];

  beforeEach(() => {
    process.env.MAGIC_HOUR_API_KEY = "mhk_test_key";
    calls.length = 0;
  });
  afterEach(() => __setFetch(null));

  it("requests an upload URL and maps the response", async () => {
    __setFetch(async (url, init) => {
      calls.push({ url, init });
      return json(200, { items: [{ upload_url: "https://u.example.com/put", file_path: "api-assets/x/1.png", expires_at: "2026-09-14T00:00:00Z" }] });
    });
    const res = await getUploadUrl("png");
    expect(res).toEqual({ uploadUrl: "https://u.example.com/put", filePath: "api-assets/x/1.png", expiresAt: "2026-09-14T00:00:00Z" });
    expect(calls[0].url).toBe("https://api.magichour.ai/v1/files/upload-urls");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ items: [{ type: "image", extension: "png" }] });
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer mhk_test_key");
  });

  it("sends the documented ai-image-editor body", async () => {
    __setFetch(async (url, init) => {
      calls.push({ url, init });
      return json(200, { id: "proj_1", credits_charged: 5 });
    });
    const res = await editImage({ prompt: "p", imageFilePaths: ["api-assets/x/1.png"], model: "flux-2-klein", resolution: "1k" });
    expect(res.id).toBe("proj_1");
    expect(res.creditsCharged).toBe(5);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      image_count: 1,
      model: "flux-2-klein",
      aspect_ratio: "auto",
      resolution: "1k",
      style: { prompt: "p" },
      assets: { image_file_paths: ["api-assets/x/1.png"] },
    });
    expect(res.body).toEqual(buildEditRequestBody({ prompt: "p", imageFilePaths: ["api-assets/x/1.png"], model: "flux-2-klein", resolution: "1k" }));
  });

  it("distinguishes 401, 402 and 429", async () => {
    __setFetch(async () => json(402, { code: "insufficient_credits", message: "Purchase credits" }));
    const e402 = await getImageProject("x").catch((e: unknown) => e);
    expect(e402).toBeInstanceOf(MagicHourError);
    expect(e402).toMatchObject({ code: "insufficient_credits", status: 402 });
    expect((e402 as MagicHourError).userMessage).toMatch(/out of credits/);

    __setFetch(async () => json(402, { code: "plan_upgrade_required", message: "Upgrade" }));
    await expect(getImageProject("x")).rejects.toMatchObject({ code: "plan_upgrade_required" });

    __setFetch(async () => json(401, { message: "bad key" }));
    await expect(getImageProject("x")).rejects.toMatchObject({ code: "unauthorized", status: 401 });

    __setFetch(async () => json(429, { message: "slow down" }));
    await expect(getImageProject("x")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });

  it("rejects unexpected response shapes", async () => {
    __setFetch(async () => json(200, { nope: true }));
    await expect(editImage({ prompt: "p", imageFilePaths: ["a"], model: "default" })).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("throws not_configured without a key", async () => {
    delete process.env.MAGIC_HOUR_API_KEY;
    __setFetch(async () => json(200, {}));
    await expect(getUploadUrl("png")).rejects.toMatchObject({ code: "not_configured" });
  });

  describe("pollUntilComplete", () => {
    it("resolves when the project completes and reports each tick", async () => {
      const statuses = ["queued", "rendering", "complete"];
      __setFetch(async () => {
        const status = statuses.shift() ?? "complete";
        return json(200, {
          id: "p",
          status,
          credits_charged: 5,
          downloads: status === "complete" ? [{ url: "https://cdn.example.com/out.png", expires_at: "2026-09-15T00:00:00Z" }] : [],
          error: null,
        });
      });
      const seen: string[] = [];
      const done = await pollUntilComplete("p", { sleep: async () => {}, onTick: (p) => seen.push(p.status) });
      expect(seen).toEqual(["queued", "rendering", "complete"]);
      expect(done.downloads[0].url).toBe("https://cdn.example.com/out.png");
    });

    it("throws typed errors on error, canceled, and timeout", async () => {
      __setFetch(async () => json(200, { id: "p", status: "error", credits_charged: 0, downloads: [], error: { code: "x", message: "boom" } }));
      await expect(pollUntilComplete("p", { sleep: async () => {} })).rejects.toMatchObject({ code: "render_failed" });

      __setFetch(async () => json(200, { id: "p", status: "canceled", credits_charged: 0, downloads: [], error: null }));
      await expect(pollUntilComplete("p", { sleep: async () => {} })).rejects.toMatchObject({ code: "canceled" });

      let clock = 0;
      __setFetch(async () => json(200, { id: "p", status: "rendering", credits_charged: 0, downloads: null, error: null }));
      await expect(
        pollUntilComplete("p", { timeoutMs: 5000, sleep: async (ms) => void (clock += ms + 1), now: () => clock }),
      ).rejects.toMatchObject({ code: "timeout" });
    });
  });
});
