/**
 * Sign out, as a form rather than a link.
 *
 * A link here was prefetchable, and a prefetched sign-out signed the weaver
 * out on its own (see `src/app/api/logout/route.ts`). A form POST cannot be
 * prefetched, and it is the honest description of what the control does.
 */
export function SignOutButton({ className = "t-caption text-ink-muted" }: { className?: string }) {
  return (
    <form action="/api/logout" method="post" className="contents">
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
