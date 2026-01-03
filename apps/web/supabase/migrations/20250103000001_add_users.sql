-- Add users table and auth trigger
-- This creates a public.users table that syncs with auth.users

-- Users table (synced with auth.users via trigger)
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	"email" text,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own record
CREATE POLICY "Users can view own record" ON "users"
	FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own record" ON "users"
	FOR UPDATE USING (auth.uid() = id);

-- Function to create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.users (id, email, name, avatar_url)
	VALUES (
		NEW.id,
		NEW.email,
		COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
		NEW.raw_user_meta_data->>'avatar_url'
	);
	RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
CREATE TRIGGER on_auth_user_created
	AFTER INSERT ON auth.users
	FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
