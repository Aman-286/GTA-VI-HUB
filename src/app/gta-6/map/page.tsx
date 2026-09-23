import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";
import { rows } from "@/lib/db";
import type { MarkerCategory, Region } from "@/types/content";

export const metadata = {
  title: "GTA VI interactive map",
  description:
    "Explore a custom-coordinate map framework with filters, favorites and completion tracking. Current geography is a clearly labeled fictional demo.",
  robots: { index: false, follow: true },
};

export default async function MapPage() {
  // The taxonomy is fetched here rather than by the client so the filter list
  // is present in the first paint. It changes only with a migration, so there
  // is nothing to keep in sync at runtime, and a request for it would have
  // shown an empty sidebar for as long as it took to answer.
  const [categories, regions] = await Promise.all([
    rows<MarkerCategory>(
      "SELECT id,name,parent_id,description FROM marker_categories ORDER BY position, name",
    ),
    rows<Region>("SELECT id,name FROM regions ORDER BY name"),
  ]);
  return (
    <Suspense fallback={<div className="map-loading">Opening the map…</div>}>
      <MapExplorer categories={categories} regions={regions} />
    </Suspense>
  );
}
