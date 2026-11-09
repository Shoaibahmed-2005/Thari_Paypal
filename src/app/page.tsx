import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { PlaceholderImage } from "@/components/ui";
import { getLiveListings } from "@/lib/listings";
import { Suspense } from "react";

const CATEGORIES = ["All", "Silk sarees", "Cotton sarees", "Dupattas"];
const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4";

async function NewFromTheLoom() {
  const { listings, source } = await getLiveListings();
  if (source === "error") {
    return <p className="t-body text-ink-muted">We couldn&apos;t load the pieces just now. Please refresh in a moment.</p>;
  }
  if (listings.length === 0) {
    return <p className="t-body text-ink-muted">New pieces are on the loom. Check back soon.</p>;
  }
  return (
    <div className={GRID}>
      {listings.map((l) => (
        <ListingCard key={l.id} l={l} />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className={GRID} aria-busy="true" aria-label="Loading pieces">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="th-card">
          <div className="th-listing__media">
            <PlaceholderImage seed={i} label="Loading" />
          </div>
          <div className="th-listing__body" style={{ height: 72 }} />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        {/* Hero */}
        <section className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
          <div className="flex flex-col justify-center gap-4 bg-coral p-6 text-on-coral md:p-10" style={{ borderRadius: "var(--radius-xl)" }}>
            <h1 className="t-display m-0">Handwoven. Sold by the weaver.</h1>
            <p className="t-body m-0">
              Sarees from Tamil Nadu looms, listed by the women who wove them, with proof each piece is handmade.
            </p>
            <div>
              <Link href="/explore" className="th-btn th-btn--primary">
                Explore the pieces
              </Link>
            </div>
          </div>
          <div className="hidden overflow-hidden md:block" style={{ borderRadius: "var(--radius-xl)", minHeight: 320 }}>
            <PlaceholderImage seed={3} label="Lakshmi at her loom" />
          </div>
        </section>

        {/* Search + chips */}
        <form action="/explore" className="th-field th-field--search mt-6 md:hidden">
          <div className="th-field__box">
            <Search strokeWidth={1.75} aria-hidden />
            <input name="q" className="th-field__input" placeholder="Search sarees" aria-label="Search" />
          </div>
        </form>
        <div className="th-row mt-4">
          {CATEGORIES.map((c, i) => (
            <button key={c} className="th-chip th-chip--select" aria-pressed={i === 0}>
              {c}
            </button>
          ))}
        </div>

        {/* Assistant promo (mobile) */}
        <Link href="/assistant" className="mt-4 flex items-center gap-3 bg-coral p-4 text-on-coral md:hidden" style={{ borderRadius: "var(--radius-lg)" }}>
          <Sparkles strokeWidth={1.75} aria-hidden />
          <span className="t-label">Ask our assistant to find your saree</span>
        </Link>

        <h2 className="t-title mb-4 mt-8">New from the loom</h2>
        <Suspense fallback={<GridSkeleton />}>
          <NewFromTheLoom />
        </Suspense>
      </main>
      <footer className="mx-auto max-w-[1200px] px-6 pb-[100px] text-center md:pb-8">
        <Link href="/demo" className="t-caption text-ink-muted">
          Judges: try Thari in 3 roles
        </Link>
      </footer>
      <BuyerBottomNav current="/" />
    </>
  );
}
