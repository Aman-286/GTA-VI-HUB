"use client";
import { useLinkStatus } from "next/link";
/**
 * Inline pending feedback for a nav link.
 *
 * The site has no loading.tsx: a route-level fallback swaps the whole page for
 * a skeleton, which makes switching sections a grey flash rather than a
 * transition. Holding the current page until the next one is ready gives a
 * direct crossfade instead, and this bar covers the one thing that costs us --
 * the lack of an instant acknowledgement that the click landed.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden="true" className={`nav-pending${pending ? " on" : ""}`} />
  );
}
