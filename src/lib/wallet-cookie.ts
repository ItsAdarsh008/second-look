import "server-only";
import { cookies } from "next/headers";
import { createWalletId } from "./billing";
import { WalletIdSchema } from "./pricing";

/** The wallet id lives in an httpOnly cookie. Only route handlers call these (cookies can't be set elsewhere). */

const WALLET_COOKIE = "sl_wallet";
/** Browsers cap cookie lifetimes at 400 days. The recovery code outlives that. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export async function readWallet(): Promise<string | null> {
  const value = (await cookies()).get(WALLET_COOKIE)?.value;
  return value && WalletIdSchema.safeParse(value).success ? value : null;
}

export async function setWallet(id: string): Promise<void> {
  (await cookies()).set(WALLET_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The visitor's wallet, creating one on first use. Creating one writes nothing to the store. */
export async function ensureWallet(): Promise<string> {
  const existing = await readWallet();
  if (existing) {
    // Refresh the expiry, so a regular visitor never loses the cookie.
    await setWallet(existing);
    return existing;
  }
  const id = createWalletId();
  await setWallet(id);
  return id;
}
