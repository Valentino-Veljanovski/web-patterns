import type { ReactNode } from "react";
import Link from "next/link";
import { createSiteMetadata } from "web-patterns/seo";
import { site } from "./site";
import "./globals.css";

export const metadata = createSiteMetadata(site);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav aria-label="Pages">
          <Link href="/">Index</Link>
          <Link href="/motion">Motion</Link>
          <Link href="/scroll">Scroll</Link>
          <Link href="/graphics">Graphics</Link>
          <Link href="/diagrams">Diagrams</Link>
          <Link href="/navigation">Navigation</Link>
          <Link href="/seo">SEO</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/chat">Chat</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
