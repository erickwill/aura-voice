'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import type { User } from '@supabase/supabase-js';

function DeviceAuthContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [code, setCode] = useState('');
  const [pageStatus, setPageStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user on mount
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Pre-fill code from URL if provided
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const signInWithGitHub = async () => {
    const callbackUrl = code
      ? `/auth/device?code=${encodeURIComponent(code)}`
      : '/auth/device';
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
      },
    });
  };

  const signInWithGoogle = async () => {
    const callbackUrl = code
      ? `/auth/device?code=${encodeURIComponent(code)}`
      : '/auth/device';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      // Redirect to sign in, then come back
      signInWithGitHub();
      return;
    }

    setPageStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/device/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_code: code.replace(/-/g, ''),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPageStatus('success');
      } else {
        setErrorMessage(data.message || data.error || 'Failed to confirm device');
        setPageStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      setPageStatus('error');
    }
  };

  // Format code as user types (XXXX-XXXX)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    }
    setCode(value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">10x</h1>
          <p className="text-gray-400">Authorize your CLI</p>
        </div>

        {pageStatus === 'success' ? (
          <div className="bg-green-900/30 border border-green-500 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-green-400 mb-2">Device Authorized</h2>
            <p className="text-gray-400">
              You can now return to your terminal. The CLI will be authenticated shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Show sign in prompt if not authenticated */}
            {!authLoading && !user && (
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <p className="text-gray-300 mb-4 text-center">
                  Sign in to authorize your CLI
                </p>
                <div className="space-y-3">
                  <button
                    onClick={signInWithGitHub}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors border border-gray-700"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Continue with GitHub
                  </button>

                  <button
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors border border-gray-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </div>
            )}

            {/* Show user info if authenticated */}
            {user && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6 flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-gray-200 font-medium">{user.user_metadata?.full_name || user.user_metadata?.name}</p>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-6">
                <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                  Enter the code shown in your terminal
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="XXXX-XXXX"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-mono tracking-wider focus:outline-none focus:border-cyan-400 text-white"
                  maxLength={9}
                  autoFocus
                  disabled={authLoading}
                />
              </div>

              {pageStatus === 'error' && (
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-400">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={code.replace(/-/g, '').length < 8 || pageStatus === 'loading' || authLoading}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white"
              >
                {pageStatus === 'loading' ? 'Authorizing...' : user ? 'Authorize Device' : 'Sign in to Authorize'}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          Need help? Run <code className="text-cyan-400">10x --help</code> in your terminal.
        </p>
      </div>
    </main>
  );
}

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950"><p className="text-gray-400">Loading...</p></div>}>
      <DeviceAuthContent />
    </Suspense>
  );
}
