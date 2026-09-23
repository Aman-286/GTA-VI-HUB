"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  UserRound,
  Menu,
  Map,
  Bookmark,
  ChevronDown,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { kinds, labels } from "@/types/content";
import { NavPending } from "./nav-pending";
import { SpoilerTrigger } from "@/components/spoilers/spoiler-settings";
const primary = ["map", "missions", "vehicles", "weapons", "cheats", "guides"];
export const openSearch = (query = "") =>
  window.dispatchEvent(new CustomEvent("hub-search", { detail: query }));
export function Header() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  // A dropdown that only closes via its own toggle traps the user once they
  // look away from it. Dismiss on outside pointer, on Escape, and whenever the
  // route changes underneath it.
  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    if (!more) return;
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMore(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMore(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [more]);
  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      <header className="site-header" ref={headerRef}>
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="GTA VI Hub home">
            <span className="brand-monogram">
              VI
              <span />
            </span>
            <span>
              GTA VI <b>HUB</b>
              <small>THE UNOFFICIAL COMPANION</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary">
            {primary.map((k) => (
              <Link
                className={current(`/gta-6/${k}`) ? "active" : ""}
                aria-current={current(`/gta-6/${k}`) ? "page" : undefined}
                href={`/gta-6/${k}`}
                key={k}
              >
                {k === "map" ? "Map" : labels[k as keyof typeof labels]}
                <NavPending />
              </Link>
            ))}
            <button
              onClick={() => setMore(!more)}
              aria-expanded={more}
              aria-controls="more-menu"
            >
              More
              <ChevronDown size={13} className={more ? "flip" : ""} />
            </button>
          </nav>
          <div className="header-actions">
            <button
              onClick={() => openSearch()}
              className="icon-button"
              aria-label="Search"
            >
              <Search size={19} />
            </button>
            <SpoilerTrigger />
            <span className="header-divider" />
            <Link
              href="/account"
              className="account-link"
              aria-current={current("/account") ? "page" : undefined}
            >
              <UserRound size={17} />
              <span>My progress</span>
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label={more ? "Close menu" : "Open menu"}
              aria-expanded={more}
              aria-controls="more-menu"
              onClick={() => setMore(!more)}
            >
              {more ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {more && (
          <nav
            className="more-menu"
            id="more-menu"
            aria-label="More categories"
          >
            {kinds.map((k) => (
              <Link
                href={`/gta-6/${k}`}
                key={k}
                className={current(`/gta-6/${k}`) ? "active" : ""}
                aria-current={current(`/gta-6/${k}`) ? "page" : undefined}
                onClick={() => setMore(false)}
              >
                {labels[k]}
              </Link>
            ))}
            <Link href="/submit" onClick={() => setMore(false)}>
              Submit a discovery
            </Link>
          </nav>
        )}
      </header>
      <nav className="mobile-bottom" aria-label="Quick navigation">
        <Link
          href="/gta-6/map"
          className={current("/gta-6/map") ? "active" : ""}
          aria-current={current("/gta-6/map") ? "page" : undefined}
        >
          <Map size={19} />
          Map
        </Link>
        <button onClick={() => openSearch()}>
          <Search size={19} />
          Search
        </button>
        <Link
          href="/gta-6/cheats"
          className={current("/gta-6/cheats") ? "active" : ""}
          aria-current={current("/gta-6/cheats") ? "page" : undefined}
        >
          <span className="key-icon">↑↓</span>Cheats
        </Link>
        <Link
          href="/account"
          className={current("/account") ? "active" : ""}
          aria-current={current("/account") ? "page" : undefined}
        >
          <Bookmark size={19} />
          My progress
        </Link>
      </nav>
    </>
  );
}
