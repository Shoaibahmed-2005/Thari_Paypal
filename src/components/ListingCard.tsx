import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatUsd } from "@/lib/money";
import { AuthenticityBadge, PlaceholderImage } from "./ui";

export interface ListingCardData {
  id: string;
  title: string;
  weaverName: string;
  town: string;
  priceUsdCents: number;
  imageUrl?: string | null;
  verified: boolean;
  seed?: number;
}

export function ListingCard({ l }: { l: ListingCardData }) {
  return (
    <article className="th-card">
      <Link href={`/p/${l.id}`} className="th-listing__media block bg-surface-tint">
        {l.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.imageUrl} alt={l.title} className="h-full w-full object-cover" />
        ) : (
          <PlaceholderImage seed={l.seed} label={l.title} />
        )}
      </Link>
      <div className="th-listing__body">
        {l.verified && (
          <div>
            <AuthenticityBadge />
          </div>
        )}
        <h3 className="th-listing__title">
          <Link href={`/p/${l.id}`}>{l.title}</Link>
        </h3>
        <span className="th-listing__weaver">
          by {l.weaverName}, {l.town}
        </span>
        <div className="th-listing__foot">
          <span className="th-price">{formatUsd(l.priceUsdCents)}</span>
          <Link href={`/p/${l.id}`} className="th-add" aria-label={`Buy ${l.title}`}>
            <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
