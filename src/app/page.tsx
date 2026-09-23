import Link from "next/link";
import Image from "next/image";
import { HomeActivity } from "@/components/home-activity";
import {
  ArrowUpRight,
  Map,
  SlidersHorizontal,
  Bookmark,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SearchTrigger } from "@/components/search/search-trigger";
import { SectionHeading, icons } from "@/components/ui";
import { counts, listEntities } from "@/lib/db/content";
import { labels, entityUrl, Kind } from "@/types/content";
export const dynamic = "force-dynamic";
/**
 * Every card claimed "3 MIN READ" regardless of the guide behind it. On a site
 * whose whole premise is that nothing is asserted without backing, a hardcoded
 * figure is the wrong detail to invent -- so it is measured, at the 200 wpm
 * convention, and floored at one minute.
 */
const readingMinutes = (body: string) =>
  Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
export default async function Home() {
  const [totals, guides] = await Promise.all([
    counts(),
    listEntities("guides"),
  ]);
  const total = totals.reduce((n, r) => n + r.n, 0);
  return (
    <div className="home container">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">
            <span className="status-dot" /> YOUR UNOFFICIAL FIELD GUIDE
          </p>
          <h1>
            Every corner.
            <br />
            Every possibility.
          </h1>
          <p className="hero-copy">
            Explore the map. Master every mission.
            <br className="desktop-break" /> Find every secret. Your journey,
            all in one place.
          </p>
          <SearchTrigger />
        </div>
        <div className="hero-art">
          {/* The hero image is the largest thing on the page, so it is a real
              <img> with priority rather than a CSS background: a background is
              only discovered once the stylesheet has parsed, which delays the
              one paint the visitor is actually waiting for. */}
          <Image
            className="hero-art-image"
            src="/media/vice-city-01-1600.webp"
            alt="Vice City at dusk in an official GTA VI screenshot"
            width={1600}
            height={900}
            priority
            unoptimized
          />
          <div className="art-caption">
            <span>THE COMPLETE COMPANION</span>
            <strong>
              GTA <span>VI</span> HUB
            </strong>
            <small>Official GTA VI screenshot · © Rockstar Games</small>
          </div>
        </div>
      </section>
      <div className="editorial-note">
        <ShieldCheck size={17} />
        <span>
          <strong>Built on evidence.</strong> We’re building the database. Game
          records and map geography shown here are labeled DEMO until sourced.
        </span>
        <Link href="/content-guidelines">
          Our standards
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <section className="map-section">
        <SectionHeading
          eyebrow="YOUR WORLD, AT A GLANCE"
          title="Leave no corner unexplored."
          href="/gta-6/map"
          link="Open interactive map"
        />
        <div className="map-feature">
          <Link
            href="/gta-6/map"
            className="map-preview"
            aria-label="Explore the fictional demonstration map"
          >
            <Image
              width={1600}
              height={1000}
              unoptimized
              src="/demo-map.svg"
              alt="Fictional schematic demonstration map with districts and waterways"
              /* Above the fold on tall and wide viewports, where it becomes the
                 largest paint. At 3.3 KB the eager fetch costs nothing even
                 when it is scrolled out of view. */
              loading="eager"
            />
            <span className="map-top-label">
              <span className="status-dot" /> INTERACTIVE MAP{" "}
              <span className="badge demo">DEMO</span>
            </span>
            {[
              [35, 40],
              [53, 60],
              [67, 30],
              [73, 69],
              [28, 72],
            ].map(([x, y], i) => (
              <span
                key={i}
                className="preview-pin"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <Map size={16} />
              </span>
            ))}
            <span className="map-coordinates">
              X 0800 · Y 0500 <span>SCHEMATIC / NOT GAME GEOGRAPHY</span>
            </span>
          </Link>
          <div className="map-feature-copy">
            <span className="eyebrow">THE BIGGER PICTURE</span>
            <h3>
              Your next discovery
              <br />
              starts here.
            </h3>
            <p>
              Find a place. Follow a lead. Keep a record of every discovery
              along the way.
            </p>
            <ul>
              <li>
                <SlidersHorizontal size={17} />
                Filter by what matters to you
              </li>
              <li>
                <Bookmark size={17} />
                Save places for your next session
              </li>
              <li>
                <ShieldCheck size={17} />
                Know what’s confirmed
              </li>
            </ul>
            <Link href="/gta-6/map" className="button primary">
              Explore the map
              <ArrowUpRight size={18} />
            </Link>
            <small>Try the map with fictional demo markers.</small>
          </div>
        </div>
      </section>
      <section>
        <SectionHeading
          eyebrow="THE FIELD NOTES"
          title="Get more out of every session."
          href="/gta-6/guides"
          link="Browse guides"
        />
        <div className="guide-grid">
          {/* A concealed guide has no slug to link to -- the server stripped
              it -- so the rail simply skips it rather than rendering a card
              that goes nowhere. */}
          {guides.items
            .filter((g) => !g.concealed)
            .slice(0, 3)
            .map((g, i) => (
              <Link href={entityUrl(g)} key={g.id} className="guide-card">
                <div className={`guide-cover guide-cover-${i}`}>
                  <Image
                    width={1600}
                    height={1000}
                    unoptimized
                    src={`/media/${["leonida-keys-01", "jason-lucia-01", "vice-city-01"][i]}-960.webp`}
                    alt={
                      [
                        "Leonida Keys and its turquoise waterways — official GTA VI screenshot",
                        "Jason and Lucia by the waterfront — official GTA VI screenshot",
                        "Vice City at dusk — official GTA VI screenshot",
                      ][i]
                    }
                    loading="lazy"
                  />
                  <span className="guide-number">0{i + 1}</span>
                  <ArrowUpRight size={20} />
                </div>
                <div className="guide-meta">
                  {g.category}
                  <span>{readingMinutes(g.body)} MIN READ</span>
                </div>
                <h3>{g.title}</h3>
                <p>{g.description}</p>
              </Link>
            ))}
        </div>
      </section>
      <p className="media-credit">
        Official GTA VI screenshots © Rockstar Games.{" "}
        <a
          href="https://www.rockstargames.com/VI/media/screenshots"
          target="_blank"
          rel="noreferrer"
        >
          Explore Rockstar’s media gallery ↗
        </a>
      </p>
      <HomeActivity />
      <section className="explore-section">
        <SectionHeading
          eyebrow="THE DATABASE"
          title="Everything, in its place."
        />
        <div className="category-grid">
          {(
            [
              "missions",
              "vehicles",
              "weapons",
              "cheats",
              "characters",
              "collectibles",
              "locations",
              "achievements",
            ] as Kind[]
          ).map((k) => {
            const Icon = icons[k],
              n = totals.find((t) => t.kind === k)?.n || 0;
            return (
              <Link href={`/gta-6/${k}`} key={k}>
                <Icon size={22} />
                <span>
                  <strong>{labels[k]}</strong>
                  <small>
                    {n
                      ? `${n} demo ${n === 1 ? "record" : "records"}`
                      : "Awaiting verified information"}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="community-strip">
        <div>
          <p className="eyebrow">BETTER, TOGETHER</p>
          <h2>Found something worth sharing?</h2>
          <p>
            Help build a companion players can trust. Every submission is
            reviewed.
          </p>
        </div>
        <Link href="/submit" className="button">
          Submit a discovery
          <ArrowRight size={17} />
        </Link>
      </section>
      <div className="home-meta">
        <span>{total} published companion & demo records</span>
        <span>No invented cheat codes. No unsourced claims.</span>
      </div>
    </div>
  );
}
