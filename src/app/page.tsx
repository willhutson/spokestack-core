import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--primary-foreground)] text-lg font-bold mb-6">
        S
      </div>
      <h1 className="text-4xl font-bold mb-4">SpokeStack</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-8 text-center max-w-2xl">
        Agent-native business infrastructure. Specialized AI agents for Tasks,
        Projects, Briefs, and Orders.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 bg-[var(--accent)] text-[var(--primary-foreground)] text-sm font-medium rounded-lg hover:bg-[var(--accent)] transition-colors"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] text-sm font-medium rounded-lg border border-[var(--border-strong)] hover:bg-[var(--bg-base)] transition-colors"
        >
          Sign In
        </Link>
      </div>
      <p className="mt-6 text-sm text-[var(--text-tertiary)]">
        Or run{" "}
        <code className="bg-[var(--bg-surface)] px-2 py-1 rounded text-xs">
          npx spokestack init
        </code>{" "}
        from your terminal
      </p>
    </main>
  );
}
