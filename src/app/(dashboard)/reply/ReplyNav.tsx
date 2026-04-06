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
            pathname === tab.href ? "border-b-2 border-indigo-600 font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
          )}>{tab.label}</Link>
      ))}
    </div>
  );
}
