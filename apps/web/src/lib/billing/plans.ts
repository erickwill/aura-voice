/**
 * Subscription plan definitions
 */

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyTokens: number;
  priceMonthly: number;  // cents (0 for free)
  priceYearly: number;   // cents (0 for free)
  stripePriceIdMonthly: string | null;  // null for free plan
  stripePriceIdYearly: string | null;   // null for free plan
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started for free',
    monthlyTokens: 100_000,    // 100k tokens
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
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
    monthlyTokens: 1_000_000,  // 1M tokens
    priceMonthly: 1500,        // $15/month
    priceYearly: 14400,        // $144/year ($12/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
    features: [
      '1M tokens/month',
      'All model tiers',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    monthlyTokens: 5_000_000,  // 5M tokens
    priceMonthly: 4900,        // $49/month
    priceYearly: 47000,        // $470/year (~$39/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
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
    monthlyTokens: 20_000_000,  // 20M tokens
    priceMonthly: 14900,        // $149/month
    priceYearly: 143000,        // $1430/year (~$119/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
    features: [
      '20M tokens/month',
      'All model tiers',
      'Priority support',
      'Early access to features',
      'Team management',
    ],
  },
];

/**
 * Get a plan by ID
 */
export function getPlanById(id: string): Plan | undefined {
  return PLANS.find(p => p.id === id);
}

/**
 * Get a plan by Stripe price ID
 */
export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find(
    p => p.stripePriceIdMonthly === priceId || p.stripePriceIdYearly === priceId
  );
}

/**
 * Check if a price ID is for yearly billing
 */
export function isYearlyPrice(priceId: string): boolean {
  return PLANS.some(p => p.stripePriceIdYearly === priceId);
}

/**
 * Get the free plan
 */
export function getFreePlan(): Plan {
  return PLANS[0];
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
