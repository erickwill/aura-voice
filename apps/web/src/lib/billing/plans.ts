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
    description: 'Try 10x for free',
    monthlyTokens: 100_000,    // 100k tokens
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      '100k tokens/month',
      'All models',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For individual developers',
    monthlyTokens: 2_000_000,  // 2M tokens
    priceMonthly: 2000,        // $20/month
    priceYearly: 19200,        // $192/year ($16/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    features: [
      '2M tokens/month',
      'All models',
      'Priority support',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    description: 'For power users',
    monthlyTokens: 10_000_000,  // 10M tokens
    priceMonthly: 10000,        // $100/month
    priceYearly: 96000,         // $960/year ($80/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_MAX_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_MAX_YEARLY || '',
    features: [
      '10M tokens/month',
      'All models',
      'Priority support',
      'Early access to features',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    description: 'For heavy usage',
    monthlyTokens: 25_000_000,  // 25M tokens
    priceMonthly: 20000,        // $200/month
    priceYearly: 192000,        // $1920/year ($160/month)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_ULTRA_YEARLY || '',
    features: [
      '25M tokens/month',
      'All models',
      'Priority support',
      'Early access to features',
      'Dedicated support channel',
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
