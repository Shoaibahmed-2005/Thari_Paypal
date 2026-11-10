import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { PlaceholderImage } from "@/components/ui";
import { CATEGORIES, SORTS, isCategory, isSort, searchListings } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Explore handwoven pieces — Thari",
  description: "Search handwoven sarees and dupattas by colour, fabric, weave or weaver.",
};

const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4";

function href(next: { q?: string; category?: string; sort?: string }) {
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.category && next.category !== "all") sp.set("category", next.category);
  if (next.sort && next.sort !== "new") sp.set("sort", next.sort);
  const qs = sp.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

/**
 * Everything that depends on searchParams lives here. With Cache Components,
 * reading searchParams outside a <Suspense> boundary blocks the static shell
 * and fails the build, so the filter bar streams in with the results.
 */
async function ExploreBody({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category = typeof sp.category === "string" && isCategory(sp.category) ? sp.category : "all";
  const sort = typeof sp.sort === "string" && isSort(sp.sort) ? sp.sort : "new";
  const { listings, source } = await searchListings({ q, category, sort });

  return (
    <>
      <form action="/explore" className="th-field th-field--search">
        <div className="th-field__box">
          <Search strokeWidth={1.75} aria-hidden />
          <input
            name="q"
            defaultValue={q}
            className="th-field__input"
            placeholder="Search colour, fabric, weave or weaver"
            aria-label="Search pieces"
          />
        </div>
        {category !== "all" && <input type="hidden" name="category" value={category} />}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
      </form>

      <div className="th-row mt-4">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={href({ q, category: c.key, sort })} className="th-chip th-chip--select" aria-pressed={category === c.key}>
            {c.label}
          </Link>
        ))}
      </div>

      <div className="th-row mt-3">
        <span className="t-caption text-ink-muted">Sort</span>
        {SORTS.map((s) => (
          <Link key={s.key} href={href({ q, category, sort: s.key })} className="th-chip th-chip--select" aria-pressed={sort === s.key}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {source === "error" ? (
          <p className="t-body text-ink-muted">We couldn&apos;t load the pieces just now. Please refresh in a moment.</p>
        ) : listings.length === 0 ? (
          <div className="th-card p-6 text-center">
            <p className="t-title m-0">Nothing matched {q ? <>&ldquo;{q}&rdquo;</> : "that filter"}</p>
            <p className="t-body mt-2 text-ink-muted">
              Try a colour like &ldquo;pink&rdquo;, a fabric like &ldquo;silk&rdquo;, or a weave like &ldquo;Kanchipuram&rdquo;.
            </p>
            <Link href="/explore" className="th-btn th-btn--secondary mt-4">
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <p className="t-caption mb-3 text-ink-muted">
              {listings.length} {listings.length === 1 ? "piece" : "pieces"}
            </p>
            <div className={GRID}>
              {listings.map((l) => (
                <ListingCard key={l.id} l={l} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
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

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        <h1 className="t-title-lg mb-4">Explore</h1>
        <Suspense fallback={<GridSkeleton />}>
          <ExploreBody searchParams={searchParams} />
        </Suspense>
      </main>
      <BuyerBottomNav current="/explore" />
    </>
  );
}
