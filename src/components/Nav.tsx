import Link from "next/link";
import { Home, Mic, Package, Search, Sparkles, User, Wallet, ShoppingBag, type LucideIcon } from "lucide-react";
import { Wordmark } from "./ui";

/** Laptop/tablet buyer top bar: wordmark left, search centre, links right. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-20 hidden bg-surface md:block" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">
        <Link href="/" aria-label="Thari home">
          <Wordmark />
        </Link>
        <form action="/explore" className="th-field th-field--search mx-auto max-w-md flex-1">
          <div className="th-field__box">
            <Search strokeWidth={1.75} aria-hidden />
            <input name="q" className="th-field__input" placeholder="Search silk, cotton, Kanchipuram…" aria-label="Search" />
          </div>
        </form>
        <nav className="flex items-center gap-1">
          <Link className="th-btn th-btn--ghost" href="/explore">Explore</Link>
          <Link className="th-btn th-btn--ghost" href="/assistant">Assistant</Link>
          <Link className="th-btn th-btn--ghost" href="/orders">Orders</Link>
        </nav>
      </div>
    </header>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

function BottomNav({ items, center, current }: { items: NavItem[]; center: NavItem; current?: string }) {
  const [a, b, c, d] = items;
  const item = (i: NavItem) => {
    const Icon = i.icon;
    return (
      <Link key={i.href} href={i.href} className="th-nav__item" aria-current={current === i.href ? "page" : undefined}>
        <Icon strokeWidth={1.75} aria-hidden />
        {i.label}
      </Link>
    );
  };
  const CenterIcon = center.icon;
  return (
    <nav className="fixed inset-x-4 bottom-4 z-20 md:hidden" aria-label="Main">
      <div className="th-nav">
        {item(a)}
        {item(b)}
        <Link href={center.href} className="th-nav__center" aria-label={center.label}>
          <CenterIcon strokeWidth={1.75} aria-hidden />
        </Link>
        {item(c)}
        {item(d)}
      </div>
    </nav>
  );
}

export function BuyerBottomNav({ current }: { current?: string }) {
  return (
    <BottomNav
      current={current}
      center={{ href: "/assistant", label: "Assistant", icon: Sparkles }}
      items={[
        { href: "/", label: "Home", icon: Home },
        { href: "/explore", label: "Explore", icon: Search },
        { href: "/orders", label: "Orders", icon: Package },
        { href: "/demo", label: "Profile", icon: User },
      ]}
    />
  );
}

export function WeaverBottomNav({ current }: { current?: string }) {
  return (
    <BottomNav
      current={current}
      center={{ href: "/w/new", label: "Sell a new piece", icon: Mic }}
      items={[
        { href: "/w", label: "Home", icon: Home },
        { href: "/w/sales", label: "Sales", icon: ShoppingBag },
        { href: "/w/money", label: "Money", icon: Wallet },
        { href: "/demo", label: "Profile", icon: User },
      ]}
    />
  );
}
