'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface UsageData {
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  periodEnd: string;
}

interface SubscriptionData {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    init();
  }, [supabase.auth]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/billing/subscription');

        if (res.ok) {
          const data = await res.json();
          setSubscription({
            planId: data.subscription?.planId || 'free',
            planName: data.plan?.name || 'Free',
            status: data.subscription?.status || 'active',
            currentPeriodEnd: data.subscription?.currentPeriodEnd || null,
          });
          setUsage(data.usage);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
    return num.toString();
  };

  const usagePercent = usage
    ? Math.min(100, (usage.tokensUsed / usage.tokensLimit) * 100)
    : 0;

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-gray-400">
          Manage your 10x subscription and usage
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-800 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Current Plan</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                subscription?.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {subscription?.status || 'Free'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-4">
              {subscription?.planName || 'Free'}
            </p>
            <Link
              href="/dashboard/billing"
              className="text-green-400 hover:text-green-300 text-sm font-medium"
            >
              Manage subscription →
            </Link>
          </div>

          {/* Token Usage */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Token Usage</h3>
            <div className="mb-2">
              <span className="text-2xl font-bold text-white">
                {usage ? formatNumber(usage.tokensUsed) : '0'}
              </span>
              <span className="text-gray-400 text-sm ml-1">
                / {usage ? formatNumber(usage.tokensLimit) : '100k'}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90 ? 'bg-red-500' :
                  usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs">
              {usage ? `${Math.round(usagePercent)}% used` : 'No usage data'}
            </p>
          </div>

          {/* Period End */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Billing Period</h3>
            <p className="text-2xl font-bold text-white mb-2">
              {usage?.periodEnd
                ? new Date(usage.periodEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </p>
            <p className="text-gray-400 text-sm">
              Usage resets on this date
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/settings"
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors group"
          >
            <h3 className="font-semibold mb-2 group-hover:text-green-400 transition-colors">
              API Tokens
            </h3>
            <p className="text-gray-400 text-sm">
              Create and manage API tokens for CLI authentication
            </p>
          </Link>

          <Link
            href="/pricing"
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors group"
          >
            <h3 className="font-semibold mb-2 group-hover:text-green-400 transition-colors">
              Upgrade Plan
            </h3>
            <p className="text-gray-400 text-sm">
              Get more tokens and unlock additional features
            </p>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 mb-4">
            Install 10x CLI to start coding with AI:
          </p>
          <div className="bg-black rounded-lg p-4 font-mono text-sm">
            <code className="text-green-400">
              curl -fsSL https://try10x.co/install | sh
            </code>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            After installation, run <code className="text-green-400 bg-gray-800 px-1 rounded">10x</code> and
            authenticate with your 10x account.
          </p>
        </div>
      </div>
    </div>
  );
}
