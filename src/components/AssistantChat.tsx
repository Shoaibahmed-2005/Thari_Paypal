"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Send, Sparkles } from "lucide-react";
import { AuthenticityBadge, PlaceholderImage } from "./ui";

interface Listing {
  id: string;
  title: string;
  weaver: string;
  town: string;
  priceUsd: number;
  verified: boolean;
  imageUrl: string | null;
  url: string;
}

interface Checkout {
  ok: boolean;
  orderId?: string;
  paypalOrderId?: string;
  totalUsd?: number;
  approveUrl?: string | null;
  error?: string;
}

interface Turn {
  role: "user" | "model";
  text: string;
  listings?: Listing[];
  checkout?: Checkout | null;
}

const SUGGESTIONS = [
  "Find a verified silk saree under $250",
  "Something in pink or green cotton",
  "What makes a piece verified handwoven?",
];

export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    const next: Turn[] = [...turns, { role: "user", text: question }];
    setTurns(next);
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // History capped at 20 turns, as the plan specifies.
        body: JSON.stringify({ messages: next.slice(-20).map((t) => ({ role: t.role, text: t.text })) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The assistant is unavailable just now.");
      setTurns((t) => [...t, { role: "model", text: body.text, listings: body.listings, checkout: body.checkout }]);
    } catch (err) {
      setTurns((t) => [
        ...t,
        { role: "model", text: err instanceof Error ? err.message : "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {turns.length === 0 && (
        <div className="th-card p-5">
          <div className="th-row">
            <Sparkles size={20} strokeWidth={1.75} aria-hidden className="text-primary" />
            <h2 className="t-title m-0">Ask Thari</h2>
          </div>
          <p className="t-body mt-2">
            Tell me what you&apos;re looking for. I can search the pieces, explain what makes one verified
            handwoven, and get a checkout ready — but you approve the payment yourself in PayPal.
          </p>
          <div className="th-row mt-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="th-chip th-chip--select" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className={t.role === "user" ? "self-end" : ""}>
          <div
            className={t.role === "user" ? "bg-coral px-4 py-3 text-on-coral" : "th-card px-4 py-3"}
            style={{ borderRadius: "var(--radius-lg)", maxWidth: t.role === "user" ? "32ch" : undefined }}
          >
            <p className="t-body m-0">{t.text}</p>
          </div>

          {t.listings && t.listings.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {t.listings.map((l, j) => (
                <Link key={l.id} href={`/p/${l.id}`} className="th-card no-underline">
                  <div className="th-listing__media bg-surface-tint">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt={l.title} className="h-full w-full object-cover" />
                    ) : (
                      <PlaceholderImage seed={j} label={l.title} />
                    )}
                  </div>
                  <div className="th-listing__body">
                    {l.verified && (
                      <div>
                        <AuthenticityBadge />
                      </div>
                    )}
                    <h3 className="th-listing__title">{l.title}</h3>
                    <span className="th-listing__weaver">
                      by {l.weaver}, {l.town}
                    </span>
                    <div className="th-price mt-1">${l.priceUsd.toFixed(0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {t.checkout?.ok && (
            <div className="th-card mt-3 p-4">
              <h3 className="t-title m-0">Ready to pay ${t.checkout.totalUsd?.toFixed(2)}</h3>
              <p className="t-caption mt-1 text-ink-muted">
                Nothing has been paid yet. You approve this in PayPal yourself.
              </p>
              <div className="th-row mt-3">
                {t.checkout.approveUrl && (
                  <a
                    href={t.checkout.approveUrl}
                    className="th-btn th-btn--primary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Approve in PayPal
                  </a>
                )}
                {t.checkout.orderId && (
                  <Link href={`/checkout/success/${t.checkout.orderId}`} className="th-btn th-btn--ghost">
                    View order
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {busy && <p className="t-caption text-ink-muted">Looking…</p>}
      <div ref={endRef} />

      <form
        className="th-field th-field--search sticky bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="th-field__box">
          <input
            className="th-field__input"
            placeholder="Ask for a colour, a fabric, a price…"
            aria-label="Ask the assistant"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="th-icon-btn" aria-label="Send" disabled={busy || !input.trim()}>
            <Send size={20} strokeWidth={1.75} />
          </button>
        </div>
      </form>
    </div>
  );
}
