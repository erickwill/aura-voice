import Link from 'next/link';
import { Nav } from '@/components/Nav';

const features = [
  {
    title: 'Smart Model Routing',
    description: 'Automatically routes tasks to the optimal model based on complexity. Simple tasks use fast, cheap models. Complex tasks get the heavy hitters.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Full File System Access',
    description: 'Read, write, edit files with surgical precision. Glob patterns, grep search, and intelligent context loading. No copy-pasting code.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Shell Integration',
    description: 'Run commands, scripts, and build tools directly. See output in real-time. Debug errors as they happen.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Persistent Sessions',
    description: 'Pick up where you left off. Session memory with SQLite storage, auto-compaction, and intelligent context management.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    title: 'Multi-Provider Support',
    description: 'Works with OpenAI, Anthropic, Google, and local models. Bring your own keys or use our hosted service.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Cost Tracking',
    description: 'Real-time token usage and cost monitoring. Set budgets, track spending per session, and optimize your workflow.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'Install',
    description: 'One command to get started. Works on macOS, Linux, and WSL.',
    code: 'curl -fsSL https://try10x.co/install | sh',
  },
  {
    number: '02',
    title: 'Authenticate',
    description: 'Sign in with GitHub or Google. Or bring your own API keys.',
    code: '10x auth login',
  },
  {
    number: '03',
    title: 'Code',
    description: 'Navigate to your project and start coding. 10x understands your codebase.',
    code: 'cd my-project && 10x',
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0a0a]">
        {/* Main bordered container - spans entire page */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="border-l border-r border-white/[0.08]">

            {/* Hero section with background image */}
            <section
              className="relative pt-24 md:pt-32 pb-48 md:pb-64"
              style={{
                backgroundImage: 'url(/header.webp)',
                backgroundSize: 'contain',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] from-30% via-[#0a0a0a]/70 via-50% to-transparent" />

              {/* Hero content */}
              <div className="relative z-10 px-6 md:px-16 py-12 md:py-16">
                {/* Version badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-sm text-gray-400">v0.0.7 Stable Release</span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  </div>
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal mb-5 tracking-tight text-white leading-[1.1] text-center">
                  The AI Coding Agent with<br />
                  Structural Integrity.
                </h1>

                {/* Subtext */}
                <p className="text-base md:text-lg text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed text-center">
                  10x doesn&apos;t just guess. It deeply understands your entire codebase
                  to plan, generate, and verify production-ready code.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Install 10x
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                  <a
                    href="https://docs.try10x.co"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1a1a1a] text-white font-medium rounded-lg border border-white/10 hover:bg-[#222] transition-colors text-sm"
                  >
                    Read Documentation
                  </a>
                </div>
              </div>
            </section>

            {/* Features */}
            <section id="features" className="py-24 px-6 md:px-16 border-t border-white/[0.08]">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif font-normal mb-4 text-white">
                  Everything you need to ship faster
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Built for developers who want AI that actually integrates with their workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-6 rounded-2xl border border-white/[0.08] bg-[#111] hover:bg-[#151515] transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-900/30 border border-emerald-800/50 text-emerald-500 flex items-center justify-center mb-5">
                      {feature.icon}
                    </div>
                    <h3 className="text-base font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section className="py-24 px-6 md:px-16 border-t border-white/[0.08]">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif font-normal mb-4 text-white">
                  Up and running in minutes
                </h2>
                <p className="text-gray-500 text-lg">
                  No complex setup. No IDE plugins. Just your terminal.
                </p>
              </div>

              <div className="space-y-4 max-w-3xl mx-auto">
                {steps.map((step, index) => (
                  <div
                    key={step.number}
                    className="flex gap-6 items-start p-6 rounded-2xl border border-white/[0.08] bg-[#111]"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1 text-white">{step.title}</h3>
                      <p className="text-gray-500 mb-3 text-sm">{step.description}</p>
                      <div className="bg-black/60 rounded-lg px-4 py-3 border border-white/[0.06]">
                        <code className="text-gray-300 text-sm font-mono">{step.code}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 md:px-16 border-t border-white/[0.08]">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-serif font-normal mb-4 text-white">
                  Ready to ship faster?
                </h2>
                <p className="text-gray-500 text-lg mb-10">
                  Join developers who are already coding at 10x speed.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Get Started Free
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors border border-white/10"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 md:px-16 border-t border-white/[0.08]">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-8">
                  <Link href="/" className="text-xl font-bold text-white">
                    10x
                  </Link>
                  <div className="flex gap-6 text-sm text-gray-500">
                    <Link href="/pricing" className="hover:text-white transition-colors">
                      Pricing
                    </Link>
                    <a href="https://docs.try10x.co" className="hover:text-white transition-colors">
                      Docs
                    </a>
                    <a
                      href="https://github.com/0xCrunchyy/10x"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      GitHub
                    </a>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  &copy; {new Date().getFullYear()} 10x. All rights reserved.
                </p>
              </div>
            </footer>

          </div>
        </div>
      </main>
    </>
  );
}
