"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "All Workflows", href: "/workflows" },
  { label: "Run History", href: "/workflows/runs" },
  { label: "Templates", href: "/workflows/templates" },
] as const;

export default function WorkflowsNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/workflows") return pathname === "/workflows";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-6">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isActive(tab.href)
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
