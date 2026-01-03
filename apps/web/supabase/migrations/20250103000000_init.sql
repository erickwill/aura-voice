-- 10x Auth Schema
-- Tables for device auth flow, API tokens, usage tracking, and subscriptions

CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_unique" UNIQUE("token")
);

CREATE TABLE "device_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_code" text NOT NULL,
	"device_code" text NOT NULL,
	"user_id" text,
	"expires_at" timestamp NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_codes_user_code_unique" UNIQUE("user_code"),
	CONSTRAINT "device_codes_device_code_unique" UNIQUE("device_code")
);

CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"plan_id" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "usage_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"monthly_token_limit" integer DEFAULT 100000 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_limits_user_id_unique" UNIQUE("user_id")
);

-- Indexes for common queries
CREATE INDEX "idx_api_tokens_user_id" ON "api_tokens" ("user_id");
CREATE INDEX "idx_device_codes_user_id" ON "device_codes" ("user_id");
CREATE INDEX "idx_usage_user_id" ON "usage" ("user_id");
CREATE INDEX "idx_usage_created_at" ON "usage" ("created_at");

-- Enable Row Level Security on all tables
ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_limits" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage own api_tokens" ON "api_tokens"
	FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own device_codes" ON "device_codes"
	FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own subscription" ON "subscriptions"
	FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own usage" ON "usage"
	FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own usage_limits" ON "usage_limits"
	FOR SELECT USING (auth.uid()::text = user_id);
