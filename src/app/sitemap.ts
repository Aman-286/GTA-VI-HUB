import type { MetadataRoute } from "next";
import { rows } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const entities = await rows<{
    kind: string;
    slug: string;
    updated_at: string;
  }>(
    "SELECT kind,slug,updated_at FROM entities WHERE status='published' AND is_demo=0 AND length(body)>=80 LIMIT 10000",
  );
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    ...entities.map((e) => ({
      url: `${origin}/gta-6/${e.kind}/${e.slug}`,
      lastModified: new Date(e.updated_at + "Z"),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["about", "content-guidelines"].map((path) => ({
      url: `${origin}/${path}`,
      priority: 0.3,
    })),
  ];
}
