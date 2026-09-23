import { search } from "@/lib/db/content";
import { EntityRow, Breadcrumbs, EmptyState } from "@/components/ui";
import { SpoilerNotice } from "@/components/spoilers/spoiler-notice";
import Link from "next/link";
export const metadata = {
  title: "Search the companion",
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { items, hidden } = q
    ? await search(q.slice(0, 120))
    : { items: [], hidden: 0 };
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <div className="page-heading">
        <h1>Find your next lead.</h1>
      </div>
      <form className="toolbar">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search the database…"
          aria-label="Search the database"
        />
        <button className="button primary" type="submit">
          Search
        </button>
      </form>
      <SpoilerNotice hidden={hidden} noun="result" omitted />
      {items.length ? (
        items.map((e) => <EntityRow key={e.id} entity={e} />)
      ) : (
        <EmptyState
          title={
            q ? `No results for “${q}”` : "Start with a name, item or place."
          }
        >
          <p>Try a broader term or browse the database.</p>
          <Link href="/gta-6/vehicles" className="button">
            Browse vehicles
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
