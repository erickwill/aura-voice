import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Note: User authentication is handled by Supabase Auth.
 * Users exist in auth.users table managed by Supabase.
 * Our custom tables reference auth.users.id via the userId field (text UUID).
 */

/**
 * Device codes - for CLI device auth flow
 */
export const deviceCodes = pgTable('device_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userCode: text('user_code').notNull().unique(),
  deviceCode: text('device_code').notNull().unique(),
  userId: text('user_id'),  // References auth.users.id (set when confirmed)
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * API tokens - for CLI authentication
 */
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),  // References auth.users.id
  token: text('token').notNull().unique(),
  name: text('name').notNull(),
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Usage tracking - API usage per user
 */
export const usage = pgTable('usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),  // References auth.users.id
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  cost: integer('cost').notNull().default(0), // In cents
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Subscription status type
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

/**
 * Subscriptions table - Stripe subscription data
 */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),  // References auth.users.id
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  planId: text('plan_id').notNull().default('free'),
  status: text('status').$type<SubscriptionStatus>().notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { mode: 'date' }),
  currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Usage limits table - tracks monthly token usage per user
 */
export const usageLimits = pgTable('usage_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),  // References auth.users.id
  monthlyTokenLimit: integer('monthly_token_limit').notNull().default(100000), // Free tier default
  tokensUsed: integer('tokens_used').notNull().default(0),
  periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
  periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
