import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-400 mb-4">
          10x
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          Code at 10x speed with AI
        </p>

        <div className="bg-gray-900 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
          <p className="text-gray-400 mb-2">Install with:</p>
          <code className="text-green-400 font-mono">
            curl -fsSL https://try10x.co/install | sh
          </code>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="https://github.com/10x-dev/10x"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-colors"
          >
            Pricing
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-green-400 mb-2">Smart Routing</h3>
          <p className="text-gray-400">Automatically routes tasks to the best model for speed and cost efficiency</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-green-400 mb-2">Powerful Tools</h3>
          <p className="text-gray-400">Read, write, edit files, search with glob and grep, run bash commands</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-green-400 mb-2">Session Memory</h3>
          <p className="text-gray-400">Persistent sessions with SQLite, auto-compaction, and context management</p>
        </div>
      </div>
    </main>
  );
}
