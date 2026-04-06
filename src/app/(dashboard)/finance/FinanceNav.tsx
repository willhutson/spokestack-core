"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/finance" },
  { label: "Budgets", href: "/finance/budgets" },
  { label: "Cash Flow", href: "/finance/cashflow" },
  { label: "Receivables", href: "/finance/receivables" },
  { label: "Revenue", href: "/finance/revenue" },
];

export default function FinanceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-[var(--border)] mb-6">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/finance"
            ? pathname === "/finance"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
