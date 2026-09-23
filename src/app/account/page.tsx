import { currentUser } from "@/lib/auth/session";
import { rows } from "@/lib/db";
import type { Entity } from "@/types/content";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { Breadcrumbs } from "@/components/ui";
import { spoilerContext } from "@/lib/spoilers/context";
import { visibleClause } from "@/lib/spoilers/sql";
export const metadata = {
  title: "My progress",
  robots: { index: false, follow: false },
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const visible = visibleClause(await spoilerContext());
  const [user, items, p] = await Promise.all([
    currentUser(),
    rows<Entity>(
      `SELECT e.* FROM entities e WHERE e.status='published' AND ${visible.clause} ORDER BY e.kind,e.title LIMIT 1000`,
      ...visible.args,
    ),
    searchParams,
  ]);
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: "My progress" }]} />
      <div className="page-heading">
        <p className="eyebrow">YOUR JOURNEY</p>
        <h1>Pick up where you left off.</h1>
        <p>
          Your discoveries, completed records and saved guides, together in one
          place.
        </p>
      </div>
      {p.error && (
        <div className="notice error" role="alert">
          {p.error === "signin-unavailable"
            ? "Please sign in using your email and password."
            : "Sign-in could not be completed. Please try again."}
        </div>
      )}
      <AccountDashboard user={user} items={items} />
    </div>
  );
}
