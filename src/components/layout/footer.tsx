import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/" className="footer-brand">
          GTA VI <span>HUB</span>
        </Link>
        <nav aria-label="Footer">
          {["about", "contact", "privacy", "terms", "content-guidelines"].map(
            (k) => (
              <Link key={k} href={`/${k}`}>
                {k.replace("-", " ")}
              </Link>
            ),
          )}
          <Link href="/submit">Submit information</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>
          Unofficial fan-created website. Not affiliated with or endorsed by
          Rockstar Games or Take-Two Interactive.
        </p>
        <span>Built for the discovery.</span>
      </div>
    </footer>
  );
}
