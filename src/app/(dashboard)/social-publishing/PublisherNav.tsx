"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/social-publishing" },
  { label: "Drafts", href: "/social-publishing/drafts" },
  { label: "Scheduled", href: "/social-publishing/scheduled" },
  { label: "Published", href: "/social-publishing/published" },
] as const;

export function PublisherNav() {
  const pathname = usePathname();

  // Strip org-slug prefix if present so matching works on both /social-publishing and /org/social-publishing
  const normalisedPath = pathname.replace(/^\/[^/]+/, "");
  const isActive = (href: string) =>
    normalisedPath === href || pathname === href;

  return (
    <nav className="flex gap-1 border-b border-[var(--border)] mb-6">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            isActive(t.href)
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
