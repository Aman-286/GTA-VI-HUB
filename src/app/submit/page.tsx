import { Breadcrumbs } from "@/components/ui";
import { SubmissionForm } from "@/components/community/submission-form";
export const metadata = {
  title: "Submit information",
  description:
    "Share a discovery or correction with public evidence. Every submission is reviewed before publication.",
};
export default async function Submit({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: "Submit information" }]} />
      <div className="page-heading">
        <p className="eyebrow">THE COMMUNITY DESK</p>
        <h1>A good discovery deserves a source.</h1>
        <p>
          Found a location, spotted a mistake, or have a useful tip? Help us
          build a reliable companion.
        </p>
      </div>
      <SubmissionForm
        initialTitle={p.title?.slice(0, 140)}
        turnstileKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </div>
  );
}
