export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">SpokeStack</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
        Agent-native business infrastructure. Specialized AI agents for Tasks,
        Projects, Briefs, and Orders.
      </p>
      <code className="bg-gray-100 px-4 py-2 rounded text-sm">
        npx spokestack init
      </code>
    </main>
  );
}
