/**
 * End-to-end smoke test of the Magic Hour flow: upload → edit → poll → download URLs.
 *
 *   npx tsx scripts/smoke-magichour.ts ./fixtures/test.png "make the sky purple" [--model flux-2-klein] [--resolution 1k] [--count 1]
 *
 * Spends real credits. Prints each step with timing and the credits charged.
 */
import { readFileSync } from "node:fs";
import { ensureServerConditions, loadEnv } from "./lib/env";

async function main(): Promise<void> {
  if (ensureServerConditions()) return;
  loadEnv();

  const { MagicHourError, editImage, getUploadUrl, pollUntilComplete, uploadImage } = await import(
    "../src/lib/clients/magicHour"
  );
  const { sniffImageType } = await import("../src/lib/clients/creative");
  const { MagicHourModelSchema, MagicHourResolutionSchema } = await import("../src/lib/schema");

  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
  const [imagePath, prompt] = positional;
  if (!imagePath || !prompt) {
    console.error('Usage: npx tsx scripts/smoke-magichour.ts <image> "<prompt>" [--model <model>] [--resolution <res>] [--count 1|4]');
    process.exitCode = 2;
    return;
  }
  const model = MagicHourModelSchema.parse(flag("model") ?? "default");
  const resolution = MagicHourResolutionSchema.parse(flag("resolution") ?? "auto");
  const imageCount = flag("count") === "4" ? 4 : 1;

  const t0 = Date.now();
  const step = (label: string, since: number) => console.log(`  ${label.padEnd(28)} ${String(Date.now() - since).padStart(6)} ms`);

  const bytes = readFileSync(imagePath);
  const type = sniffImageType(bytes);
  if (!type) throw new Error("Image must be PNG, JPEG or WebP");
  console.log(`Magic Hour smoke test — ${imagePath} (${(bytes.length / 1024).toFixed(0)} KB, ${type.mediaType})`);
  console.log(`  model=${model} resolution=${resolution} image_count=${imageCount}`);
  console.log(`  prompt: ${prompt}\n`);

  try {
    let t = Date.now();
    const upload = await getUploadUrl(type.extension);
    step("POST /v1/files/upload-urls", t);
    console.log(`    file_path: ${upload.filePath}`);

    t = Date.now();
    await uploadImage(upload.uploadUrl, bytes, type.mediaType);
    step("PUT presigned upload", t);

    t = Date.now();
    const job = await editImage({ prompt, imageFilePaths: [upload.filePath], model, resolution, imageCount, name: "Second Look smoke test" });
    step("POST /v1/ai-image-editor", t);
    console.log(`    project id: ${job.id}   credits_charged: ${job.creditsCharged}`);
    console.log(`    body: ${JSON.stringify(job.body)}`);

    t = Date.now();
    let last = "";
    const done = await pollUntilComplete(job.id, {
      onTick: (p, elapsed) => {
        if (p.status !== last) {
          console.log(`    ${String(elapsed).padStart(6)} ms  status=${p.status}`);
          last = p.status;
        }
      },
    });
    step("poll until complete", t);

    console.log(`\n  credits charged: ${done.creditsCharged}`);
    for (const d of done.downloads) console.log(`  download: ${d.url}\n    expires: ${d.expiresAt}`);
    console.log(`\nTotal ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  } catch (err) {
    if (err instanceof MagicHourError) {
      console.error(`\nMagicHourError ${err.code} (HTTP ${err.status ?? "-"}): ${err.message}`);
      console.error(`  user message: ${err.userMessage}`);
      if (err.body) console.error(`  body: ${JSON.stringify(err.body)}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

void main();
