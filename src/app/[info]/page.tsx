import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui";
const pages: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  about: {
    title: "Built for the discovery.",
    intro:
      "GTA VI Hub is an independent companion for players who want useful answers and a clear record of their journey.",
    sections: [
      [
        "An unofficial field guide",
        "This fan-created project is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive. We use an original visual identity and independently written companion content.",
      ],
      [
        "Evidence first",
        "Gameplay information belongs here only when its source is clear. Fictional records and the current map carry DEMO labels. The original coastal concept artwork is atmospheric illustration, not game imagery.",
      ],
      [
        "A companion, not a game save",
        "Your checklist records actions you take on this website. It does not read or modify your console or game account.",
      ],
    ],
  },
  contact: {
    title: "Talk to the editorial desk.",
    intro:
      "Help us keep this companion useful, accurate and respectful of original work.",
    sections: [
      [
        "Corrections and discoveries",
        "Use Submit information to send an evidence link and describe the issue. Do not include sensitive personal information. Each submission enters an editor-reviewed queue.",
      ],
      [
        "Owner contact",
        "A dedicated contact address has not been configured for this development instance. The owner must add a monitored contact address before opening a public service.",
      ],
    ],
  },
  privacy: {
    title: "Privacy, in plain language.",
    intro:
      "This page describes the current development application. The owner must review and complete it before a public launch.",
    sections: [
      [
        "What the companion stores",
        "Guest and account checklists, favorites, recent record views, community submissions and editorial actions are stored in Cloudflare D1. A necessary HttpOnly cookie identifies your session for up to 30 days. Recent searches and unsaved editor drafts may be stored in your browser.",
      ],
      [
        "Signing in",
        "Accounts use an email address, display name and password. Passwords are stored as salted hashes, never plain text. Recovery codes are also stored as hashes. Email addresses are currently sign-in identifiers; we do not send verification or password-reset emails. We do not request access to your game accounts.",
      ],
      [
        "Search measurement",
        "Submitted search terms, result counts and clicked records may be counted to improve coverage. Search events have no account ID. Obvious email addresses, URLs and long numbers are excluded, but do not put private information in search. Deployment maintenance removes events older than 30 days.",
      ],
      [
        "External services",
        "Hosting and database services are provided by Cloudflare. Sign-in is managed by this website. Turnstile may verify community submissions. Fonts are provided by Google Fonts. Optional Cloudflare Web Analytics is disabled unless the owner configures it.",
      ],
      [
        "Your information",
        "Signed-in users can export their checklist and submission data from Account settings. Contact the owner for deletion requests; a monitored owner contact address must be added before public launch. Guest access is lost when its session cookie is cleared or expires.",
      ],
    ],
  },
  terms: {
    title: "Using the companion.",
    intro:
      "Use this unofficial companion responsibly. These development site rules need owner review before public launch.",
    sections: [
      [
        "Content and availability",
        "Information may be incomplete, unavailable or subject to correction. DEMO content is fictional. Verification labels describe our editorial assessment and are not guarantees. Free infrastructure imposes traffic and storage limits.",
      ],
      [
        "Your contributions",
        "Only submit information you are entitled to share. Link to evidence and write descriptions in your own words. Do not upload copied articles, private information, harassment, malicious links or spam. Submissions are reviewed before publication.",
      ],
      [
        "Intellectual property",
        "Game names and trademarks belong to their respective owners. This website claims no official relationship with Rockstar Games or Take-Two Interactive. Attribution and source links do not authorize copying protected artwork or articles.",
      ],
    ],
  },
  "content-guidelines": {
    title: "A source behind every claim.",
    intro:
      "A useful companion should tell you what is known, what is uncertain, and why.",
    sections: [
      [
        "Official",
        "A linked official source supports the stated fact. An editor checks both the source and the claim before assigning this status.",
      ],
      [
        "Verified",
        "An editor has reviewed supporting evidence. This can include documented gameplay and trustworthy primary material.",
      ],
      [
        "Community Verified",
        "Community-provided evidence has been reviewed by an editor. A community submission alone does not establish verification.",
      ],
      [
        "Unverified and Rumor",
        "Unverified claims lack sufficient reviewed evidence. Rumors are explicitly uncertain. Neither status should be mistaken for confirmation.",
      ],
      [
        "Demo records",
        "Fictional examples help test the companion. They are visibly marked DEMO, excluded from verified discoveries and search engine indexing, and cannot receive a verified status.",
      ],
      [
        "Corrections and revisions",
        "Editors record changes and their supporting sources. Published content has revision history; rollback produces a new draft for review. Community approval never publishes a page automatically.",
      ],
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  return {
    title: pages[info]?.title || "Not found",
    alternates: { canonical: `/${info}` },
  };
}
export default async function Info({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  const p = pages[info];
  if (!p) notFound();
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: info.replaceAll("-", " ") }]} />
      <div className="page-heading">
        <p className="eyebrow">GTA VI HUB</p>
        <h1>{p.title}</h1>
        <p>{p.intro}</p>
      </div>
      <article className="article-body">
        {p.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <Link className="button" href="/submit">
          Submit information
        </Link>
      </article>
    </div>
  );
}
