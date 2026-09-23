/// <reference types="react/canary" />
"use client";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
/**
 * Crossfades the main content on every route change.
 *
 * Keying on the pathname turns each navigation into an exit/enter pair, which
 * is what activates the enter/exit animations.
 *
 * `default="none"` keeps this boundary silent on updates. That matters for
 * more than unrelated transitions: an update animation here would snapshot the
 * whole page body and swallow the inner tab boundaries, crossfading the
 * heading and tab strip along with the panel. The skeleton -> content step is
 * animated in loading.tsx instead, where it actually happens.
 *
 * Header, footer and quick-nav stay in the untouched root snapshot, so only
 * the page body moves.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
