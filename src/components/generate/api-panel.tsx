"use client";

import { useEffect, useId, useState } from "react";
import {
  MAGIC_HOUR_DOCS_URL,
  MAGIC_HOUR_EDITOR_DOCS_URL,
  curlSnippet,
  nodeSnippet,
  type EditImageRequestBody,
} from "@/lib/magic-hour-shared";
import type { EditJob } from "@/lib/schema";
import { CodeBlock, CopyButton } from "./code-block";

type Tab = "body" | "curl" | "node";
const TABS: { id: Tab; label: string }[] = [
  { id: "body", label: "Request body" },
  { id: "curl", label: "curl" },
  { id: "node", label: "Node" },
];

function seconds(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export interface ApiActivity {
  submittedAt: number;
  respondedAt: number | null;
  projectId: string | null;
  creditsCharged: number | null;
}

/** The exact Magic Hour request, as body / curl / Node, plus the live polling responses. */
export function ApiPanel({
  body,
  pending,
  job,
  activity,
}: {
  body: EditImageRequestBody;
  /** True before submit: the file path is filled in by the server at upload time. */
  pending: boolean;
  job: EditJob | null;
  activity: ApiActivity | null;
}) {
  const [tab, setTab] = useState<Tab>("body");
  const tabsId = useId();
  const running = Boolean(activity) && (!job || job.status === "queued" || job.status === "rendering" || job.status === "draft");
  const now = useNow(running);

  const code = tab === "body" ? JSON.stringify(body, null, 2) : tab === "curl" ? curlSnippet(body) : nodeSnippet(body);
  const createdAt = job ? Date.parse(job.createdAt) : (activity?.submittedAt ?? 0);
  const elapsed = job && !running ? Date.parse(job.updatedAt) - createdAt : now - createdAt;

  return (
    <section aria-labelledby={`${tabsId}-title`} className="code-plate overflow-hidden rounded-[6px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--plate-rule)] px-5 pb-3 pt-4">
        <div>
          <h3 id={`${tabsId}-title`} className="font-serif text-[1.55rem] leading-tight">
            The Magic Hour request
          </h3>
          <p className="font-mono text-[0.85rem] text-[var(--plate-dim)]">POST https://api.magichour.ai/v1/ai-image-editor</p>
        </div>
        <a href={MAGIC_HOUR_EDITOR_DOCS_URL} target="_blank" rel="noreferrer" className="text-sm text-[var(--tok-string)] underline underline-offset-2">
          Endpoint reference
        </a>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-[var(--plate-rule)] px-3">
        <div role="tablist" aria-label="Request format" className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`${tabsId}-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = TABS.findIndex((x) => x.id === tab);
                const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
                setTab(next.id);
                document.getElementById(`${tabsId}-${next.id}`)?.focus();
              }}
              tabIndex={tab === t.id ? 0 : -1}
              className={`border-b-2 px-3 py-2.5 text-sm ${tab === t.id ? "border-[var(--plate-fg)] text-[var(--plate-fg)]" : "border-transparent text-[var(--plate-dim)] hover:text-[var(--plate-fg)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CopyButton text={code} />
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`}>
        <CodeBlock code={code} label={`Magic Hour request as ${tab}`} />
        {pending && (
          <p className="px-5 pb-3 text-[0.8rem] text-[var(--plate-dim)]">
            The image path is assigned when this app uploads your creative through <span className="font-mono">POST /v1/files/upload-urls</span>.
          </p>
        )}
      </div>

      <div className="border-t border-[var(--plate-rule)] px-5 py-4" aria-live="polite">
        <div className="flex items-baseline justify-between">
          <h4 className="text-sm text-[var(--plate-dim)]">Responses</h4>
          {activity && <span className="font-mono text-[0.8rem] tabular-nums text-[var(--plate-dim)]">{seconds(elapsed)}</span>}
        </div>
        {!activity ? (
          <p className="mt-1.5 text-sm text-[var(--plate-dim)]">Nothing sent yet. Responses from Magic Hour appear here as the job runs.</p>
        ) : (
          <ol className="mt-2 space-y-1 font-mono text-[0.8rem] leading-relaxed">
            <li>
              <span className="text-[var(--plate-dim)]">POST /v1/ai-image-editor</span>{" "}
              {activity.respondedAt === null ? (
                <span>waiting…</span>
              ) : (
                <span>
                  200 <span className="tok-string">{`{ "id": "${activity.projectId}", "credits_charged": ${activity.creditsCharged} }`}</span>
                </span>
              )}
            </li>
            {job?.pollLog.map((entry, i) => (
              <li key={`${entry.status}-${i}`}>
                <span className="inline-block w-14 tabular-nums text-[var(--plate-dim)]">{seconds(Date.parse(entry.at) - createdAt)}</span>
                <span className="text-[var(--plate-dim)]">GET /v1/image-projects/{job.magicHourProjectId.slice(0, 8)}…</span>{" "}
                <span className={entry.status === "complete" ? "tok-string" : entry.status === "error" || entry.status === "canceled" ? "tok-keyword" : "tok-number"}>
                  {`"status": "${entry.status}"`}
                </span>
                {entry.status === "complete" && job.downloads.length > 0 && (
                  <span className="text-[var(--plate-dim)]">
                    , {job.downloads.length} download{job.downloads.length === 1 ? "" : "s"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-[0.8rem] text-[var(--plate-dim)]">
          Polled through this app&rsquo;s server, which holds the API key. The key never reaches your browser.
        </p>
      </div>

      <p className="border-t border-[var(--plate-rule)] px-5 py-3 text-sm">
        Generated with the{" "}
        <a href={MAGIC_HOUR_DOCS_URL} target="_blank" rel="noreferrer" className="text-[var(--tok-string)] underline underline-offset-2">
          Magic Hour API
        </a>
        . Claude wrote the findings; Magic Hour renders the image.
      </p>
    </section>
  );
}
