import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenText,
  Database,
  FileInput,
  Home,
  Lightbulb,
  Newspaper,
  PenLine,
  Settings,
  Sparkles
} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dilip LinkedIn Studio",
  description: "Self-hosted LinkedIn post and article generator."
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/post-studio", label: "Post Studio", icon: PenLine },
  { href: "/article-studio", label: "Article Studio", icon: Newspaper },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/brand-memory", label: "Brand Memory", icon: Sparkles },
  { href: "/imports", label: "Imports", icon: FileInput },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link className="brand" href="/dashboard">
              <BookOpenText size={24} />
              <span>Dilip LinkedIn Studio</span>
            </Link>
            <nav className="nav">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.href}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
