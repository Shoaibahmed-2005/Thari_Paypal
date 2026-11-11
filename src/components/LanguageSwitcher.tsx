"use client";

import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { LANGUAGES, fontStackFor } from "@/lib/languages";

/**
 * Lets the weaver pick the language she speaks to Thari in.
 *
 * Each option is written in its own script, because someone who reads only
 * Telugu cannot find "Telugu" in a list written in English. That is the whole
 * point of the control.
 */
export function LanguageSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  async function choose(code: string) {
    if (code === current) return setOpen(false);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/settings/language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: code }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not change the language.");
      // A full reload rather than router.refresh(): every string on the page
      // comes from the server in her language, and refresh() was leaving the
      // page in the old one. Reloading is honest about what is happening and
      // always works.
      window.location.reload();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not change the language.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="th-chip th-chip--select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe size={14} strokeWidth={1.75} aria-hidden />
        <span style={{ fontFamily: fontStackFor(active.script) }} lang={active.code}>
          {active.nativeName}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="th-card absolute right-0 z-30 mt-2 list-none p-1"
          style={{ minWidth: 190 }}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === current}
                className="th-row w-full justify-between px-3 py-2 text-left"
                style={{ border: 0, background: "transparent", cursor: "pointer", borderRadius: "var(--radius-sm)" }}
                onClick={() => choose(l.code)}
              >
                <span className="t-body" style={{ fontFamily: fontStackFor(l.script) }} lang={l.code}>
                  {l.nativeName}
                </span>
                {l.code === current && <Check size={16} strokeWidth={2} className="text-primary" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="t-caption absolute right-0 mt-1 text-ink-muted">{error}</p>}
    </div>
  );
}
