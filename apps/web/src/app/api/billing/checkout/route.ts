import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db, subscriptions } from '@/lib/db';
import { getPlanById } from '@/lib/billing/plans';
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/billing/stripe';

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, interval = 'monthly' } = body;

    // Validate plan
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'invalid_plan', message: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Free plan doesn't need checkout
    if (plan.id === 'free') {
      return NextResponse.json(
        { error: 'invalid_plan', message: 'Cannot checkout for free plan' },
        { status: 400 }
      );
    }

    // Get the price ID
    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) {
      return NextResponse.json(
        { error: 'invalid_plan', message: 'Price not configured for this plan' },
        { status: 400 }
      );
    }

    // Get user metadata for name
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || null;

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      user.id,
      user.email,
      userName
    );

    // Update subscription record with customer ID
    await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        stripeCustomerId: customerId,
        planId: 'free',
        status: 'active',
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        },
      });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/pricing`,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
