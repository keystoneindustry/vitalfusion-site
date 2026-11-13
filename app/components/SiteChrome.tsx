/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { site } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <img src={site.logo} alt="" width={34} height={34} className="logo-img" />
          <span className="logo-text">{site.brand}</span>
        </Link>
        <nav className="nav-links">
          <Link href="/#results" className="hide-sm">Results</Link>
          <Link href="/#how" className="hide-sm">How it works</Link>
          <Link href="/#about" className="hide-sm">About</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <p className="footer-brand">{site.brand}</p>
      {site.instagram && (
        <p>
          <a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer">
            Instagram @{site.instagram}
          </a>
        </p>
      )}
      <p className="muted">© {new Date().getFullYear()} {site.brand}. All rights reserved.</p>
    </footer>
  );
}
