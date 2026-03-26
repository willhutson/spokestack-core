import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpokeStack — Agent-Native Business Infrastructure",
  description:
    "Specialized AI agents for Tasks, Projects, Briefs, and Orders — sharing a unified context graph that compounds organizational intelligence weekly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
