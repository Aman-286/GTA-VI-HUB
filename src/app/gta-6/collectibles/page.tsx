import { listEntities } from "@/lib/db/content";
import { Breadcrumbs } from "@/components/ui";
import { CollectibleList } from "@/components/entities/collectible-list";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA VI collectibles checklist",
  robots: { index: false, follow: true },
};
export default async function Collectibles() {
  const { items } = await listEntities("collectibles");
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: "Collectibles" }]} />
      <div className="page-heading">
        <p className="eyebrow">ONE DISCOVERY AT A TIME</p>
        <h1>Make every find count.</h1>
        <p>A clear view of what you’ve found, and what’s still out there.</p>
      </div>
      <div className="notice">
        DEMO collection. These eight sample tokens are fictional and do not
        represent GTA VI collectibles.
      </div>
      <CollectibleList items={items} />
    </div>
  );
}
