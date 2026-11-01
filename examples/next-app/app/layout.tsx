import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "web-patterns example",
  description: "Every web-patterns component rendered in a Next 16 App Router app. Built in CI as the host proof.",
};

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
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
