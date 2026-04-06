"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Inbox", href: "/reply" },
  { label: "Auto-Reply", href: "/reply/auto" },
  { label: "Crisis", href: "/reply/crisis" },
  { label: "FAQ", href: "/reply/faq" },
];

export function ReplyNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b mb-6">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href}
          className={cn("px-4 py-2 text-sm transition-colors",
            pathname === tab.href ? "border-b-2 border-[var(--accent)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
          )}>{tab.label}</Link>
      ))}
    </div>
  );
}
