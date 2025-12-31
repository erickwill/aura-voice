import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Supabase Auth
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed, redirect to error page
  return NextResponse.redirect(`${origin}/auth/signin?error=callback_error`);
}
