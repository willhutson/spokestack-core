"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/time-leave" },
  { label: "Timer", href: "/time-leave/timer" },
  { label: "Timesheets", href: "/time-leave/timesheets" },
  { label: "My Leave", href: "/time-leave/my-leave" },
  { label: "Request Leave", href: "/time-leave/request" },
  { label: "Calendar", href: "/time-leave/calendar" },
  { label: "Approvals", href: "/time-leave/approvals" },
];

export function TimeLeaveNav() {
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
