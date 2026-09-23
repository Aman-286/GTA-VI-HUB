import Link from "next/link";
import {
  ShieldCheck,
  ArrowUpRight,
  Compass,
  CarFront,
  Crosshair,
  Flag,
  Gem,
  MapPin,
  BookOpen,
  KeyRound,
  Users,
  Building2,
  Store,
  Sparkles,
  Trophy,
  Eye,
} from "lucide-react";
import type { Entity } from "@/types/content";
import { entityUrl, labels } from "@/types/content";
export const icons = {
  missions: Flag,
  vehicles: CarFront,
  weapons: Crosshair,
  cheats: KeyRound,
  characters: Users,
  locations: MapPin,
  collectibles: Gem,
  properties: Building2,
  businesses: Store,
  activities: Compass,
  secrets: Eye,
  "easter-eggs": Sparkles,
  achievements: Trophy,
  guides: BookOpen,
};
export function Badge({
  entity,
}: {
  entity: Pick<Entity, "is_demo" | "verification">;
}) {
  return entity.is_demo ? (
    <span className="badge demo">DEMO</span>
  ) : (
    <span
      className={`badge ${entity.verification === "Unverified" ? "neutral" : ""}`}
    >
      <ShieldCheck size={12} />
      {entity.verification}
    </span>
  );
}
export function EntityRow({
  entity,
  children,
}: {
  entity: Entity;
  children?: React.ReactNode;
}) {
  const Icon = icons[entity.kind];
  return (
    <div className="entity-row">
      <span className="entity-icon">
        <Icon size={20} />
      </span>
      <Link href={entityUrl(entity)} className="entity-row-main">
        <span className="row-title">
          {entity.title} <Badge entity={entity} />
        </span>
        <span className="muted row-description">{entity.description}</span>
      </Link>
      <span className="row-category">
        {entity.category || labels[entity.kind]}
      </span>
      {children}
      <Link
        className="icon-button"
        href={entityUrl(entity)}
        aria-label={`View ${entity.title}`}
      >
        <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <Link href="/">Home</Link>
      {items.map((i, n) => (
        <span key={n}>
          <span aria-hidden="true">/</span>
          {i.href ? <Link href={i.href}>{i.label}</Link> : i.label}
        </span>
      ))}
    </nav>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Compass size={32} />
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  href,
  link = "View all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          {link}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
