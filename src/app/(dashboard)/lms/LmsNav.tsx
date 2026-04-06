"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", href: "/lms" },
  { label: "Courses", href: "/lms/courses" },
  { label: "My Learning", href: "/lms/my-learning" },
  { label: "Certifications", href: "/lms/certifications" },
  { label: "Create Course", href: "/lms/create" },
  { label: "Analytics", href: "/lms/analytics" },
];

export function LmsNav() {
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
