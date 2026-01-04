'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PLAN_DISPLAY = {
  free: { name: 'Free', tokens: '100k', price: '$0' },
  starter: { name: 'Starter', tokens: '1M', price: '$15' },
  pro: { name: 'Pro', tokens: '5M', price: '$49' },
  team: { name: 'Team', tokens: '20M', price: '$149' },
};

interface SubscriptionData {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    tokensUsed: number;
    tokensLimit: number;
    tokensRemaining: number;
    periodEnd: string;
  };
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok) {
          const data = await res.json();
          setSubscription({
            planId: data.subscription?.planId || 'free',
            planName: data.plan?.name || 'Free',
            status: data.subscription?.status || 'active',
            currentPeriodEnd: data.subscription?.currentPeriodEnd || null,
            cancelAtPeriodEnd: data.subscription?.cancelAtPeriodEnd || false,
            usage: data.usage,
          });
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const usagePercent = subscription?.usage
    ? Math.min(100, (subscription.usage.tokensUsed / subscription.usage.tokensLimit) * 100)
    : 0;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08] h-64"></div>
          <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08] h-64"></div>
        </div>
      </div>
    );
  }

  const planInfo = PLAN_DISPLAY[subscription?.planId as keyof typeof PLAN_DISPLAY] || PLAN_DISPLAY.free;
  const isPaid = subscription?.planId && subscription.planId !== 'free';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-gray-400">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Current Plan</h2>
            <span className={`px-3 py-1 text-sm rounded-full ${
              subscription?.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : subscription?.status === 'trialing'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {subscription?.status || 'Active'}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{planInfo.name}</span>
              <span className="text-gray-500">{planInfo.price}/month</span>
            </div>
            <p className="text-gray-500">
              {planInfo.tokens} tokens per month
            </p>
          </div>

          {subscription?.cancelAtPeriodEnd && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-400 text-sm">
                Your subscription will be canceled at the end of the current period
                {subscription.currentPeriodEnd && ` (${formatDate(subscription.currentPeriodEnd)})`}
              </p>
            </div>
          )}

          {subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
            <p className="text-gray-500 text-sm mb-6">
              Next billing date: {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {isPaid ? (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-medium rounded-xl transition-colors text-center"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08]">
          <h2 className="text-xl font-semibold mb-6">Usage This Period</h2>

          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-gray-500">Tokens used</span>
              <span className="text-sm text-gray-500">
                {subscription?.usage ? formatNumber(subscription.usage.tokensUsed) : '0'} /
                {subscription?.usage ? formatNumber(subscription.usage.tokensLimit) : '100k'}
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90 ? 'bg-red-500' :
                  usagePercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/[0.06]">
              <p className="text-gray-500 text-sm mb-1">Used</p>
              <p className="text-xl font-semibold text-white">
                {subscription?.usage ? formatNumber(subscription.usage.tokensUsed) : '0'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/[0.06]">
              <p className="text-gray-500 text-sm mb-1">Remaining</p>
              <p className="text-xl font-semibold text-emerald-400">
                {subscription?.usage ? formatNumber(subscription.usage.tokensRemaining) : '100k'}
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            Usage resets on{' '}
            <span className="text-white">
              {subscription?.usage?.periodEnd
                ? formatDate(subscription.usage.periodEnd)
                : 'the first of the month'}
            </span>
          </p>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6">Compare Plans</h2>
        <div className="bg-[#111] rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-4 text-gray-500 font-medium">Plan</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Tokens</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Price</th>
                  <th className="text-left p-4 text-gray-500 font-medium">Features</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PLAN_DISPLAY).map(([id, plan]) => {
                  const isCurrent = subscription?.planId === id || (!subscription?.planId && id === 'free');
                  return (
                    <tr key={id} className="border-b border-white/[0.06] last:border-0">
                      <td className="p-4">
                        <span className="font-medium">{plan.name}</span>
                        {isCurrent && (
                          <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500">{plan.tokens}/month</td>
                      <td className="p-4 text-gray-500">{plan.price}/month</td>
                      <td className="p-4 text-gray-500">
                        {id === 'free' && 'Community support'}
                        {id === 'starter' && 'Priority support'}
                        {id === 'pro' && 'Priority support + Early access'}
                        {id === 'team' && 'All features + Team management'}
                      </td>
                      <td className="p-4">
                        {!isCurrent && (
                          <Link
                            href="/pricing"
                            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                          >
                            {id === 'free' ? 'Downgrade' : 'Upgrade'}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Billing FAQ */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6">Billing FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08]">
            <h3 className="font-medium mb-2">When am I charged?</h3>
            <p className="text-gray-500 text-sm">
              You&apos;re charged at the beginning of each billing period. Your usage resets at the same time.
            </p>
          </div>
          <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.08]">
            <h3 className="font-medium mb-2">Can I change plans?</h3>
            <p className="text-gray-500 text-sm">
              Yes! Upgrades take effect immediately. Downgrades take effect at the next billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
