import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/auth';
import { db, subscriptions } from '@/lib/db';
import { getPlanById, getFreePlan } from '@/lib/billing/plans';
import { getUsageSummary } from '@/lib/billing/usage';

/**
 * GET /api/billing/subscription
 * Get current user's subscription and usage status
 */
export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in' },
        { status: 401 }
      );
    }

    // Get subscription
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const planId = sub?.planId || 'free';
    const plan = getPlanById(planId) || getFreePlan();

    // Get usage summary
    const usageSummary = await getUsageSummary(user.id);

    return NextResponse.json({
      subscription: {
        planId: plan.id,
        planName: plan.name,
        status: sub?.status || 'active',
        currentPeriodStart: sub?.currentPeriodStart || null,
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
        hasStripeSubscription: !!sub?.stripeSubscriptionId,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        monthlyTokens: plan.monthlyTokens,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
      },
      usage: {
        tokensUsed: usageSummary.currentPeriod.used,
        tokensLimit: usageSummary.currentPeriod.limit,
        tokensRemaining: usageSummary.currentPeriod.remaining,
        percentUsed: Math.round(
          (usageSummary.currentPeriod.used / usageSummary.currentPeriod.limit) * 100
        ),
        periodEnd: usageSummary.currentPeriod.periodEnd,
      },
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
