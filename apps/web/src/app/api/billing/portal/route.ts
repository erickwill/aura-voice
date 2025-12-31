import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/auth';
import { db, subscriptions } from '@/lib/db';
import { createPortalSession } from '@/lib/billing/stripe';

/**
 * POST /api/billing/portal
 * Create a Stripe billing portal session
 */
export async function POST() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in' },
        { status: 401 }
      );
    }

    // Get user's subscription to find Stripe customer ID
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'no_subscription', message: 'No active subscription found' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create portal session
    const portalSession = await createPortalSession({
      customerId: sub.stripeCustomerId,
      returnUrl: `${appUrl}/billing`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
