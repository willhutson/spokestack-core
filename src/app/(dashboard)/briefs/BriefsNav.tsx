"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "All Briefs", href: "/briefs" },
  { label: "New", href: "/briefs/new" },
  { label: "Triage", href: "/briefs/triage" },
  { label: "Review", href: "/briefs/review" },
  { label: "Pending", href: "/briefs/pending" },
];

export function BriefsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b mb-6">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href}
          className={cn("px-4 py-2 text-sm transition-colors",
            pathname === tab.href ? "border-b-2 border-indigo-600 font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
          )}>{tab.label}</Link>
      ))}
    </div>
  );
}
