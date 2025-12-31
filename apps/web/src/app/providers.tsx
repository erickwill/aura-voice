'use client';

/**
 * Client-side providers wrapper
 * Note: Supabase Auth uses cookies, so no SessionProvider is needed.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
