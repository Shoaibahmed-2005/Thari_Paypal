import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  Clock,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "ghost";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  icon?: ReactNode;
}
export function Button({ variant = "primary", block, icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cx("th-btn", `th-btn--${variant}`, block && "th-btn--block", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Icon-only button; aria-label is required. */
export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} className={cx("th-icon-btn", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- TextField ---------- */
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  search?: boolean;
}
export function TextField({ label, hint, error, icon, search, id, className, ...rest }: TextFieldProps) {
  const inputId = id ?? rest.name;
  return (
    <div className={cx("th-field", search && "th-field--search", error && "th-field--error", className)}>
      {label && (
        <label className="th-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="th-field__box">
        {icon}
        <input id={inputId} className="th-field__input" {...rest} />
      </div>
      {(error || hint) && <span className="th-field__hint">{error ?? hint}</span>}
    </div>
  );
}

/* ---------- StatusChip (always icon + word) ---------- */
export type ChipStatus =
  | "listed"
  | "sold"
  | "paid"
  | "shipped"
  | "delivered"
  | "refunded"
  | "payout-pending";
const CHIP: Record<ChipStatus, { label: string; icon: LucideIcon; mod: string }> = {
  listed: { label: "Listed", icon: Tag, mod: "listed" },
  sold: { label: "Sold", icon: ShoppingBag, mod: "sold" },
  paid: { label: "Paid", icon: Check, mod: "paid" },
  shipped: { label: "Shipped", icon: Truck, mod: "shipped" },
  delivered: { label: "Delivered", icon: PackageCheck, mod: "delivered" },
  refunded: { label: "Refunded", icon: RotateCcw, mod: "refund" },
  "payout-pending": { label: "Payout pending", icon: Clock, mod: "" },
};
export function StatusChip({ status }: { status: ChipStatus }) {
  const c = CHIP[status];
  const Icon = c.icon;
  return (
    <span className={cx("th-chip", c.mod && `th-chip--${c.mod}`)}>
      <Icon strokeWidth={1.75} aria-hidden />
      {c.label}
    </span>
  );
}

/* ---------- AuthenticityBadge ---------- */
export interface AuthEvidence {
  weaverName: string;
  town: string;
  loomClipDate?: string;
  coopName: string;
  coopConfirmedDate: string;
  giTag?: string | null;
}
export function AuthenticityBadge({ full, evidence }: { full?: boolean; evidence?: AuthEvidence }) {
  if (!full || !evidence) {
    return (
      <span className="th-auth">
        <BadgeCheck strokeWidth={1.75} aria-hidden />
        Verified handwoven
      </span>
    );
  }
  return (
    <div className="th-auth th-auth--full">
      <BadgeCheck strokeWidth={1.75} aria-hidden />
      <div>
        <div className="th-auth__title">Verified handwoven</div>
        <ul className="th-auth__list">
          <li>
            Woven by {evidence.weaverName} in {evidence.town}
          </li>
          {evidence.loomClipDate && <li>Filmed on her loom, {evidence.loomClipDate}</li>}
          <li>
            Confirmed by {evidence.coopName}, {evidence.coopConfirmedDate}
          </li>
          {evidence.giTag && <li>{evidence.giTag}</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------- PlaceholderImage (woven stripes, hue varies per seed) ---------- */
export function PlaceholderImage({ seed = 0, className, label }: { seed?: number; className?: string; label?: string }) {
  const hue = (seed * 47) % 60; // small rotation keeps it in the coral/gold family
  return (
    <div
      role="img"
      aria-label={label ?? "Photo coming soon"}
      className={cx("th-weave h-full w-full", className)}
      style={{ filter: `hue-rotate(${hue - 20}deg)` }}
    />
  );
}

/* ---------- Wordmark ---------- */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("font-serif", className)} style={{ fontWeight: 600, fontSize: 24 }}>
      <span style={{ color: "var(--coral)", fontFamily: "var(--font-tamil)" }} lang="ta">
        தறி
      </span>{" "}
      <span style={{ color: "var(--ink)" }}>Thari</span>
    </span>
  );
}
