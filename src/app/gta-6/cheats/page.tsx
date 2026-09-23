import { rows } from "@/lib/db";
import { Entity } from "@/types/content";
import { Breadcrumbs } from "@/components/ui";
import { CheatList } from "@/components/entities/cheat-list";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA VI cheat codes",
  description:
    "A source-driven GTA VI cheat database. No invented codes or unverified button combinations.",
  alternates: { canonical: "/gta-6/cheats" },
};
export default async function Cheats() {
  const items = await rows<
    Entity & { platform: string; code: string; effect: string; warning: string }
  >(
    "SELECT e.*,c.effect,c.warning,cc.platform,cc.code FROM entities e JOIN cheats c ON c.entity_id=e.id JOIN cheat_codes cc ON cc.cheat_id=e.id WHERE e.status='published' AND e.verification IN ('Official','Verified','Community Verified') AND e.is_demo=0 ORDER BY e.title LIMIT 100",
  );
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: "Cheat codes" }]} />
      <div className="page-heading">
        <p className="eyebrow">STRAIGHT TO THE POINT</p>
        <h1>GTA VI cheat codes</h1>
        <p>Clear inputs. Supported platforms. Evidence behind every code.</p>
      </div>
      <CheatList items={items} />
    </div>
  );
}
