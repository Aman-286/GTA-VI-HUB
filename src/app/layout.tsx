import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchCommand } from "@/components/search/search-command";
import { SpoilerSettings } from "@/components/spoilers/spoiler-settings";
import { CompanionTools } from "@/components/webmcp";
import { PageTransition } from "@/components/layout/page-transition";
import "./globals.css";
import "./map.css";
import "./admin.css";
import "./transitions.css";
/**
 * Self-hosted through next/font rather than an @import in globals.css. That
 * import cost a third request chain before any text could paint -- stylesheet,
 * then Google's font CSS, then the font files -- and handed every visitor's IP
 * to a third party. These are served from our own origin, preloaded, and given
 * a matching fallback so the swap does not shift the layout.
 */
const bodyFont = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  fallback: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  fallback: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});
const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "GTA VI Hub — The unofficial companion",
    template: "%s | GTA VI Hub",
  },
  description:
    "Explore the map, browse guides and keep track of discoveries. An independent, source-driven GTA VI companion with clearly labeled demo content.",
  openGraph: {
    title: "GTA VI Hub",
    description: "Your unofficial companion. Explore. Discover. Keep track.",
    type: "website",
  },
  robots: { index: !origin.includes("localhost"), follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      /* Tells Next to suspend the smooth scrolling declared in globals.css
         while a route transition runs, so navigation still jumps to the top
         instantly and in-page anchors keep their eased scroll. */
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${displayFont.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <SearchCommand />
        <SpoilerSettings />
        <CompanionTools />
      </body>
    </html>
  );
}
