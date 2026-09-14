"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", maxWidth: "40rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 400 }}>Second Look didn&rsquo;t load.</h1>
        <p>Something failed before the page could render. Reload to try again.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", textDecoration: "underline", background: "none", border: 0, cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
