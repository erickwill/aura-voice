'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started for free',
    monthlyTokens: '100k',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '100k tokens/month',
      'All model tiers',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individual developers',
    monthlyTokens: '1M',
    priceMonthly: 15,
    priceYearly: 12,
    features: [
      '1M tokens/month',
      'All model tiers',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    monthlyTokens: '5M',
    priceMonthly: 49,
    priceYearly: 39,
    features: [
      '5M tokens/month',
      'All model tiers',
      'Priority support',
      'Early access to features',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams and organizations',
    monthlyTokens: '20M',
    priceMonthly: 149,
    priceYearly: 119,
    features: [
      '20M tokens/month',
      'All model tiers',
      'Priority support',
      'Early access to features',
      'Team management',
    ],
  },
];

export default function PricingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    if (planId === 'free') {
      router.push('/dashboard/billing');
      return;
    }

    setLoading(planId);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-400">
            10x
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Start free, scale as you grow
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-600 px-2 py-0.5 rounded">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 ${
                  isPopular
                    ? 'bg-gradient-to-b from-green-900/50 to-gray-900 border-2 border-green-500'
                    : 'bg-gray-900 border border-gray-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-black text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-gray-400">/month</span>
                  )}
                </div>

                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2">
                    <span className="text-green-400 font-semibold">{plan.monthlyTokens}</span> tokens/month
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isPopular
                      ? 'bg-green-500 hover:bg-green-600 text-black'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.id ? (
                    'Loading...'
                  ) : plan.id === 'free' ? (
                    'Get Started'
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border-t border-gray-800 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="font-semibold mb-2">What are tokens?</h3>
              <p className="text-gray-400">
                Tokens are the unit of text that AI models process. Roughly 1 token ≈ 4 characters or ¾ of a word.
                Your usage includes both input (your prompts) and output (AI responses).
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Can I bring my own API key?</h3>
              <p className="text-gray-400">
                Yes! 10x supports BYOK (Bring Your Own Key) mode. You can use your own OpenRouter API key
                and pay for usage directly. No subscription required.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="font-semibold mb-2">What happens if I exceed my token limit?</h3>
              <p className="text-gray-400">
                You&apos;ll receive a notification when you&apos;re approaching your limit. Once exceeded,
                you can upgrade your plan or wait for the next billing cycle to reset.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-400">
                Absolutely. You can cancel your subscription at any time. You&apos;ll continue to have access
                until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>&copy; 2024 10x. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
