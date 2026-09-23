import Link from "next/link";
import { EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="container page-content">
      <EmptyState title="Off the beaten path.">
        <p>
          We couldn’t find this page. The record may have moved or is still
          being reviewed.
        </p>
        <Link className="button primary" href="/">
          Back to the hub
        </Link>
      </EmptyState>
    </div>
  );
}
