import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { EmptyState } from "@/components/ui";
export const metadata = {
  title: "Editorial workspace",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await currentUser();
  if (
    (!user?.email && !user?.github_id) ||
    !user.roles.some((r) => ["editor", "admin"].includes(r))
  )
    return (
      <div className="container page-content">
        <EmptyState title="The editorial workspace.">
          <p>
            Sign in with an authorized editor account to manage content, review
            sources and moderate submissions.
          </p>
          <Link href="/account" className="button primary">
            Go to account
          </Link>
        </EmptyState>
      </div>
    );
  return (
    <Suspense
      fallback={
        <div className="skeleton-page">
          <div className="skeleton" />
        </div>
      }
    >
      <AdminWorkspace isAdmin={user.roles.includes("admin")} />
    </Suspense>
  );
}
