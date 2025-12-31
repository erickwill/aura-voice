import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { db, usage, usageLimits, subscriptions } from '@/lib/db';
import { getPlanById, getFreePlan } from './plans';

export interface UsageLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  periodEnd: Date;
}

/**
 * Check if a user has remaining usage
 */
export async function checkUsageLimit(userId: string): Promise<UsageLimitResult> {
  const now = new Date();

  // Get or create usage limits for user
  let [limit] = await db
    .select()
    .from(usageLimits)
    .where(eq(usageLimits.userId, userId))
    .limit(1);

  if (!limit) {
    // Create default free tier limits
    limit = await createUsageLimits(userId, 'free');
  }

  // Check if we need to reset the period
  if (limit.periodEnd < now) {
    limit = await resetUsagePeriod(userId);
  }

  const remaining = limit.monthlyTokenLimit - limit.tokensUsed;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: limit.monthlyTokenLimit,
    used: limit.tokensUsed,
    periodEnd: limit.periodEnd,
  };
}

/**
 * Record token usage
 */
export async function recordUsage(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number = 0
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;

  // Insert usage record
  await db.insert(usage).values({
    userId,
    model,
    inputTokens,
    outputTokens,
    cost,
  });

  // Update usage limits counter
  await db
    .update(usageLimits)
    .set({
      tokensUsed: sql`${usageLimits.tokensUsed} + ${totalTokens}`,
      updatedAt: new Date(),
    })
    .where(eq(usageLimits.userId, userId));
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: string): Promise<{
  currentPeriod: UsageLimitResult;
  planId: string;
  planName: string;
}> {
  // Get subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const planId = sub?.planId || 'free';
  const plan = getPlanById(planId) || getFreePlan();

  const currentPeriod = await checkUsageLimit(userId);

  return {
    currentPeriod,
    planId,
    planName: plan.name,
  };
}

/**
 * Create usage limits for a new user
 */
export async function createUsageLimits(
  userId: string,
  planId: string = 'free'
): Promise<typeof usageLimits.$inferSelect> {
  const plan = getPlanById(planId) || getFreePlan();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [limit] = await db
    .insert(usageLimits)
    .values({
      userId,
      monthlyTokenLimit: plan.monthlyTokens,
      tokensUsed: 0,
      periodStart,
      periodEnd,
    })
    .onConflictDoUpdate({
      target: usageLimits.userId,
      set: {
        monthlyTokenLimit: plan.monthlyTokens,
        updatedAt: new Date(),
      },
    })
    .returning();

  return limit;
}

/**
 * Reset usage for a new billing period
 */
export async function resetUsagePeriod(
  userId: string
): Promise<typeof usageLimits.$inferSelect> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [limit] = await db
    .update(usageLimits)
    .set({
      tokensUsed: 0,
      periodStart,
      periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(usageLimits.userId, userId))
    .returning();

  return limit;
}

/**
 * Update usage limits when plan changes
 */
export async function updateUsageLimitsForPlan(
  userId: string,
  planId: string
): Promise<void> {
  const plan = getPlanById(planId) || getFreePlan();

  await db
    .update(usageLimits)
    .set({
      monthlyTokenLimit: plan.monthlyTokens,
      updatedAt: new Date(),
    })
    .where(eq(usageLimits.userId, userId));
}
