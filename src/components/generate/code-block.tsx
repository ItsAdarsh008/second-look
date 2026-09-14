"use client";

import { Fragment, useState } from "react";

type Token = { text: string; kind: "key" | "string" | "number" | "keyword" | "comment" | "plain" };

const PATTERN =
  /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"(?=\s*:))|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b-?\d+(?:\.\d+)?\b)|(\b(?:const|let|await|async|do|while|new|return|true|false|null|curl)\b|--[a-z-]+)/g;

/** Tiny highlighter for JSON, shell and JS snippets. Enough for a request panel; no dependency. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    const index = m.index ?? 0;
    if (index > last) tokens.push({ text: source.slice(last, index), kind: "plain" });
    const kind: Token["kind"] = m[1] ? "comment" : m[2] ? "key" : m[3] ? "string" : m[4] ? "number" : "keyword";
    tokens.push({ text: m[0], kind });
    last = index + m[0].length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last), kind: "plain" });
  return tokens;
}

export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <pre
      className="max-h-[28rem] overflow-auto whitespace-pre-wrap px-5 py-4 font-mono text-[0.82rem] leading-[1.65] [overflow-wrap:anywhere]"
      aria-label={label}
      tabIndex={0}
    >
      <code>
        {tokenize(code).map((t, i) =>
          t.kind === "plain" ? <Fragment key={i}>{t.text}</Fragment> : (
            <span key={i} className={`tok-${t.kind}`}>
              {t.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 1800);
      }}
      className="rounded-[4px] border border-[var(--plate-rule)] px-2.5 py-1 text-[0.8rem] text-[var(--plate-fg)] hover:border-[var(--plate-dim)]"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}
