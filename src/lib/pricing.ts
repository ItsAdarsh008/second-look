import { z } from "zod";

/**
 * What a review costs the person running it. Shared by the server (checkout, billing) and the
 * pricing dialog, so it holds no secrets.
 *
 * A review costs about $0.25 in Claude usage (see Reference → Money in DEPLOY.md) plus a Magic Hour
 * render. Stripe takes roughly 2.9% + $0.30 a payment, and the smallest pack keeps that under 7% of
 * the price. Prices are USD; an account that settles in another currency pays a conversion fee on
 * top, so check the account's own rates before trusting a margin figure.
 */

/** Reviews a new visitor may run before paying. Each includes one render, like a paid one. */
export const FREE_REVIEWS = 1;

/** Alternatives from Magic Hour included with each review. More cost one review each. */
export const RENDERS_PER_REVIEW = 1;

export const PackIdSchema = z.enum(["starter", "team", "agency"]);
export type PackId = z.infer<typeof PackIdSchema>;

export interface Pack {
  id: PackId;
  name: string;
  reviews: number;
  /** In US cents. */
  priceCents: number;
  /** Who it's for, in a few words. */
  blurb: string;
}

export const PACKS: readonly Pack[] = [
  { id: "starter", name: "Starter", reviews: 10, priceCents: 1500, blurb: "One campaign and its revisions" },
  { id: "team", name: "Team", reviews: 50, priceCents: 5900, blurb: "A brand team’s launch calendar" },
  { id: "agency", name: "Agency", reviews: 200, priceCents: 19900, blurb: "Many clients, many markets" },
];

export function getPack(id: PackId): Pack {
  const pack = PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown pack: ${id}`);
  return pack;
}

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "$1.18" a review, rounded to the cent. */
export function pricePerReview(pack: Pack): string {
  return `$${(pack.priceCents / pack.reviews / 100).toFixed(2)}`;
}

/**
 * The recovery code is the wallet id: 20 characters of Crockford base32 (100 bits), shown in
 * groups of five. Crockford's alphabet has no I, L, O or U, so a code read aloud or retyped
 * survives the usual mix-ups, which `normalizeWalletCode` folds back.
 */
export const WALLET_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const WALLET_ID_LENGTH = 20;
export const WalletIdSchema = z.string().regex(new RegExp(`^[${WALLET_ALPHABET}]{${WALLET_ID_LENGTH}}$`));

export function formatWalletCode(id: string): string {
  return id.match(/.{1,5}/g)?.join("-") ?? id;
}

export function normalizeWalletCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}
