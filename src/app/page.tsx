import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold mb-6">
        S
      </div>
      <h1 className="text-4xl font-bold mb-4">SpokeStack</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
        Agent-native business infrastructure. Specialized AI agents for Tasks,
        Projects, Briefs, and Orders.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Sign In
        </Link>
      </div>
      <p className="mt-6 text-sm text-gray-400">
        Or run{" "}
        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
          npx spokestack init
        </code>{" "}
        from your terminal
      </p>
    </main>
  );
}
