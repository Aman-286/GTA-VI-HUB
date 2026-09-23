"use client";
import { Search, ArrowUpRight } from "lucide-react";
import { openSearch } from "@/components/layout/header";
export function SearchTrigger() {
  return (
    <>
      <button className="hero-search" onClick={() => openSearch()}>
        <Search size={21} />
        <span>Search missions, vehicles, weapons, locations…</span>
        <kbd>Ctrl K</kbd>
        <ArrowUpRight className="search-arrow" size={20} />
      </button>
      <div className="popular-searches">
        <span>QUICK FIND</span>
        {["Cheat codes", "Interactive map", "Vehicles", "Collectibles"].map(
          (q) => (
            <button key={q} onClick={() => openSearch(q)}>
              {q}
              <ArrowUpRight size={12} />
            </button>
          ),
        )}
      </div>
    </>
  );
}
