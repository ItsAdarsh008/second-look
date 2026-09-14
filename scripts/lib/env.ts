import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Scripts import modules guarded by `server-only`, which only resolves to an
 * empty module under the `react-server` export condition. Re-run this process
 * with that condition if it's missing, so `npx tsx scripts/<name>.ts` just works.
 * Returns true when the caller should stop (the child already ran).
 */
export function ensureServerConditions(): boolean {
  const hasCondition = [...process.execArgv, process.env.NODE_OPTIONS ?? ""].some((a) => a.includes("react-server"));
  if (hasCondition) return false;
  const child = spawnSync(process.execPath, [...process.execArgv, "--conditions=react-server", ...process.argv.slice(1)], {
    stdio: "inherit",
    env: process.env,
  });
  process.exitCode = child.status ?? 1;
  return true;
}

/** Load `.env.local` then `.env` (without overriding variables already set). */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
