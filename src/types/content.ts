export const kinds = [
  "missions",
  "vehicles",
  "weapons",
  "cheats",
  "characters",
  "locations",
  "collectibles",
  "properties",
  "businesses",
  "activities",
  "secrets",
  "easter-eggs",
  "achievements",
  "guides",
] as const;
export type Kind = (typeof kinds)[number];
export const verifications = [
  "Official",
  "Verified",
  "Community Verified",
  "Unverified",
  "Rumor",
] as const;
export type Verification = (typeof verifications)[number];
export interface Entity {
  id: string;
  kind: Kind;
  slug: string;
  title: string;
  description: string;
  body: string;
  category: string;
  verification: Verification;
  is_demo: number;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  meta_description: string | null;
  image_url: string | null;
  image_credit: string | null;
  revision: number;
  updated_at: string;
  /** Phase 1 spoiler safety. See src/lib/spoilers/policy.ts. */
  spoiler_level: number;
  spoiler_category: string;
  reveal_after_sequence: number | null;
  safe_title: string | null;
  safe_description: string | null;
  /** Opaque handle used to reveal a concealed record without naming it. */
  reveal_token: string | null;
}
export interface Marker extends Entity {
  marker_id: string;
  x: number;
  y: number;
  marker_category: string;
  subcategory?: string;
}
/**
 * One marker with everything the detail panel states. Requested per marker
 * rather than per viewport: the list only needs enough to draw a pin, and
 * sending every field for ninety pins would cost more than the map saves by
 * clustering.
 */
export interface MarkerDetail extends Marker {
  concealed?: boolean;
  spoiler_reason?: string;
  region_name: string | null;
  unlock_requirements: string;
  marker_verification: string;
  verified_at: string | null;
  version_label: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  notes: string;
  contributed: number;
  discovered: boolean;
  visit_later: boolean;
}
export interface MarkerCategory {
  id: string;
  name: string;
  parent_id: string | null;
  description: string;
}
export interface Region {
  id: string;
  name: string;
}
export interface Source {
  id: string;
  title: string;
  url: string;
  type: string;
  fact: string;
}
export interface User {
  id: string;
  username: string;
  github_id: string | null;
  email?: string | null;
  roles: string[];
}
export const labels: Record<Kind, string> = {
  missions: "Missions",
  vehicles: "Vehicles",
  weapons: "Weapons",
  cheats: "Cheat codes",
  characters: "Characters",
  locations: "Locations",
  collectibles: "Collectibles",
  properties: "Properties",
  businesses: "Businesses",
  activities: "Activities",
  secrets: "Secrets",
  "easter-eggs": "Easter eggs",
  achievements: "Achievements",
  guides: "Guides",
};
export const entityUrl = (e: Pick<Entity, "kind" | "slug">) =>
  `/gta-6/${e.kind}/${e.slug}`;
