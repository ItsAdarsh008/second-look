"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ApiRequestError,
  confirmCheckout,
  fetchWallet,
  restoreWallet,
  startCheckout,
  type CheckoutConfirmation,
  type Wallet,
} from "@/lib/clients/secondlook";
import { FREE_REVIEWS, PACKS, formatPrice, pricePerReview, type PackId } from "@/lib/pricing";
import { EASE_OUT } from "../motion/primitives";

/** Why the pricing sheet opened: out of reviews, out of included alternatives, or asked for. */
export type PricingReason = "review" | "render" | null;

interface Billing {
  wallet: Wallet | null;
  /** Reviews this visitor can start now, free and paid together. Null until the wallet loads. */
  allowance: number | null;
  openPricing: (reason?: PricingReason) => void;
  refresh: () => Promise<void>;
}

const BillingContext = createContext<Billing | null>(null);

/** Null on a deployment without a paywall, where every caller behaves as if reviews were free. */
export function useBilling(): Billing | null {
  return useContext(BillingContext);
}

export function reviewsLabel(n: number): string {
  return `${n} ${n === 1 ? "review" : "reviews"}`;
}

export function BillingProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return enabled ? <BillingRoot>{children}</BillingRoot> : <>{children}</>;
}

type Notice = { title: string; body?: string; code?: string | null };

function noticeFor(confirmation: CheckoutConfirmation, wallet: Wallet): Notice {
  if (confirmation.status === "fulfilled") {
    return {
      title: `${reviewsLabel(confirmation.reviews)} added. You have ${reviewsLabel(wallet.reviews)}.`,
      body: "Keep this recovery code to use them in another browser. It’s also on the Stripe checkout page.",
      code: wallet.code,
    };
  }
  if (confirmation.status === "pending") {
    return {
      title: "Your payment is processing.",
      body: `The ${reviewsLabel(confirmation.reviews)} are added as soon as Stripe confirms it. Bank payments can take a few days.`,
    };
  }
  return { title: "That checkout didn’t finish, so nothing was charged." };
}

function BillingRoot({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [pricing, setPricing] = useState<{ open: boolean; reason: PricingReason }>({ open: false, reason: null });
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = useCallback(async () => {
    try {
      setWallet(await fetchWallet());
    } catch {
      /* keep the last known wallet; the server enforces the real one */
    }
  }, []);

  // Stripe sends the buyer back with ?purchase=success&session_id=…, or ?purchase=cancelled.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    const sessionId = params.get("session_id");
    if (purchase) {
      params.delete("purchase");
      params.delete("session_id");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    if (purchase === "success" && sessionId) {
      confirmCheckout(sessionId)
        .then(async (confirmation) => {
          const next = await fetchWallet();
          setWallet(next);
          setNotice(noticeFor(confirmation, next));
        })
        .catch(() => {
          setNotice({ title: "Checkout complete. Your reviews will appear in a minute.", body: "If they don’t, reload the page." });
          void refresh();
        });
      return;
    }
    if (purchase === "cancelled") setNotice({ title: "Checkout cancelled. Nothing was charged." });
    void refresh();
  }, [refresh]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<Billing>(
    () => ({
      wallet,
      allowance: wallet ? wallet.free + wallet.reviews : null,
      openPricing: (reason = null) => setPricing({ open: true, reason }),
      refresh,
    }),
    [wallet, refresh],
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
      <PricingDialog
        open={pricing.open}
        reason={pricing.reason}
        wallet={wallet}
        onClose={() => setPricing((p) => ({ ...p, open: false }))}
        onRestored={(next) => {
          setWallet(next);
          setPricing((p) => ({ ...p, open: false }));
          setNotice({ title: `Reviews restored. You have ${reviewsLabel(next.reviews)}.` });
        }}
      />
      <BillingNotice notice={notice} onDismiss={dismissNotice} />
    </BillingContext.Provider>
  );
}

/* ------------------------------- pricing sheet ------------------------------ */

function leadFor(reason: PricingReason): string {
  const what = "Each review reads the picture, the words and the launch date against every market you pick, and includes one alternative from Magic Hour.";
  if (reason === "review") return `You’ve used your free review. ${what}`;
  if (reason === "render") return "This review’s included alternative is used. Another one costs one review from a pack.";
  return what;
}

function PricingDialog({
  open,
  reason,
  wallet,
  onClose,
  onRestored,
}: {
  open: boolean;
  reason: PricingReason;
  wallet: Wallet | null;
  onClose: () => void;
  onRestored: (wallet: Wallet) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const ids = useId();
  const [busy, setBusy] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Coming back from Stripe with the browser's back button restores this page from the cache, busy state and all.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const buy = async (pack: PackId) => {
    setBusy(pack);
    setError(null);
    try {
      const { url } = await startCheckout(pack);
      window.location.assign(url);
    } catch (err) {
      setBusy(null);
      setError(err instanceof ApiRequestError ? err.message : "Checkout didn’t open, and nothing was charged. Try again.");
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${ids}-title`}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog element itself, not its contents, is a click on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
      className="sheet-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(50rem,calc(100%-2rem))] max-w-none overflow-y-auto rounded-[12px] border border-rule bg-paper p-0 text-ink backdrop:bg-[rgb(10_11_13/0.5)]"
    >
      <div className="flex items-start justify-between gap-6 border-b border-rule px-5 pt-6 pb-5 sm:px-7">
        <div>
          <h2 id={`${ids}-title`} className="font-serif text-[2rem] leading-none tracking-tight sm:text-[2.4rem]">
            Buy reviews
          </h2>
          <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-ink-2">{leadFor(reason)}</p>
          {wallet && wallet.reviews > 0 && <p className="mt-2 text-[0.9rem] text-ink-3">You have {reviewsLabel(wallet.reviews)} left.</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-sheet hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ul className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-7">
        {PACKS.map((pack) => (
          <li key={pack.id}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => buy(pack.id)}
              className="group grid h-full w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-[10px] border border-rule bg-sheet px-4 py-3.5 text-left transition-colors hover:border-ink focus-visible:border-ink disabled:cursor-wait disabled:opacity-60 disabled:hover:border-rule sm:flex sm:flex-col sm:items-stretch sm:py-4"
            >
              {/* On a phone the button sits beside the details, so all three packs fit on one screen. */}
              <span className="flex flex-col">
                <span className="text-[0.85rem] text-ink-3">{pack.name}</span>
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 sm:mt-2">
                  <span className="font-serif text-[2.2rem] leading-none sm:text-[2.5rem]">{formatPrice(pack.priceCents)}</span>
                  <span className="text-[0.85rem] text-ink-3">{pricePerReview(pack)} a review</span>
                </span>
                <span className="mt-2 text-[1rem] font-medium sm:mt-3">{reviewsLabel(pack.reviews)}</span>
                <span className="mt-0.5 text-[0.88rem] text-ink-2">{pack.blurb}</span>
              </span>
              <span className="sm:mt-auto sm:pt-4">
                <span className="block rounded-[6px] bg-ink px-4 py-2.5 text-center text-[0.92rem] font-medium whitespace-nowrap text-paper transition-colors duration-200 group-enabled:group-hover:bg-pencil">
                  {busy === pack.id ? (
                    "Opening…"
                  ) : (
                    <>
                      Buy<span className="max-sm:hidden"> {pack.reviews} reviews</span>
                    </>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-5 sm:px-7">
        <p className="max-w-[70ch] text-[0.88rem] leading-relaxed text-ink-3">
          Reviews never expire. A review or alternative that fails is refunded automatically. Stripe handles the payment; Second Look never sees
          your card. Prices in US dollars.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[0.92rem] text-critical">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-rule px-5 py-5 sm:px-7">
        {wallet?.code ? <RecoveryCode code={wallet.code} /> : <RestoreForm onRestored={onRestored} />}
      </div>
    </dialog>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked: the code is on screen to copy by hand */
        }
      }}
      className="rounded-[6px] border border-rule-strong px-3 py-1.5 text-[0.85rem] text-ink transition-colors hover:border-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function RecoveryCode({ code }: { code: string }) {
  return (
    <div>
      <p className="text-[0.85rem] text-ink-3">Your recovery code</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <code className="font-mono text-[1.05rem] tracking-wide select-all">{code}</code>
        <CopyButton text={code} />
      </div>
      <p className="mt-2 text-[0.88rem] text-ink-2">Enter it in another browser to use your reviews there.</p>
    </div>
  );
}

function RestoreForm({ onRestored }: { onRestored: (wallet: Wallet) => void }) {
  const id = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setPending(true);
        setError(null);
        try {
          onRestored(await restoreWallet(code));
          setCode("");
        } catch (err) {
          setError(err instanceof ApiRequestError ? err.message : "Couldn’t restore that code. Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor={id} className="text-[0.9rem] text-ink-2">
        Bought reviews in another browser? Enter the recovery code from that purchase.
      </label>
      <div className="mt-2 flex max-w-[30rem] gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 rounded-[6px] border border-rule-strong bg-sheet px-3 py-2 font-mono text-[0.92rem] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-3/70 focus:border-pencil focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="rounded-[6px] border border-ink px-4 py-2 text-[0.9rem] font-medium transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink"
        >
          {pending ? "Restoring…" : "Restore"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[0.88rem] text-critical">
          {error}
        </p>
      )}
    </form>
  );
}

/* ---------------------------------- notice ---------------------------------- */

function BillingNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  // A notice carrying a recovery code stays until dismissed; the rest step aside on their own.
  useEffect(() => {
    if (!notice || notice.code) return;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [notice, onDismiss]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.title}
          role="status"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="fixed inset-x-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-50 mx-auto max-w-[32rem] rounded-[10px] border border-rule-strong bg-sheet px-4 py-3.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] sm:px-5"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium">{notice.title}</p>
            <button type="button" onClick={onDismiss} className="shrink-0 text-[0.88rem] text-ink-3 underline underline-offset-4 hover:text-ink">
              Dismiss
            </button>
          </div>
          {notice.body && <p className="mt-1 text-[0.9rem] text-ink-2">{notice.body}</p>}
          {notice.code && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <code className="font-mono text-[1rem] tracking-wide select-all">{notice.code}</code>
              <CopyButton text={notice.code} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------- small pieces ------------------------------- */

/** Next to a Run button: what running costs ("Your first review is free", "3 reviews left") and how long it takes, or a way to buy more. */
export function RunNote({ allowanceClassName = "" }: { allowanceClassName?: string }) {
  const billing = useBilling();
  const duration = "Takes about a minute.";
  if (!billing?.wallet) return <>{duration}</>;
  const { wallet, openPricing } = billing;
  if (wallet.reviews > 0 || wallet.free > 0) {
    const allowance =
      wallet.reviews > 0 ? `${reviewsLabel(wallet.reviews)} left.` : FREE_REVIEWS === 1 ? "Your first review is free." : `${wallet.free} free reviews left.`;
    return (
      <>
        <span className={allowanceClassName}>{allowance}</span> {duration}
      </>
    );
  }
  return (
    <>
      <span className={allowanceClassName}>No reviews left.</span>{" "}
      <button type="button" onClick={() => openPricing("review")} className="text-pencil underline underline-offset-4">
        Buy reviews
      </button>
    </>
  );
}

/** The header's way into the pricing sheet, showing what's left. Nothing on a deployment without a paywall. */
export function WalletButton() {
  const billing = useBilling();
  if (!billing) return null;
  const { wallet, openPricing } = billing;
  const label = !wallet ? "Reviews" : wallet.reviews > 0 ? `${reviewsLabel(wallet.reviews)} left` : wallet.free > 0 ? `${wallet.free} free` : "Buy reviews";
  return (
    <button
      type="button"
      onClick={() => openPricing(null)}
      className="rounded-[6px] border border-rule-strong px-2.5 py-1 text-[0.85rem] text-ink transition-colors hover:border-ink sm:text-[0.9rem]"
    >
      {label}
    </button>
  );
}
