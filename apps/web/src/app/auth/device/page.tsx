'use client';

import { useState } from 'react';

export default function DeviceAuthPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      // TODO: Get actual user ID from session
      const response = await fetch('/api/auth/device/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_code: code.replace('-', ''),
          user_id: 'demo-user', // TODO: Replace with actual session user
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to confirm device');
        setStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error');
      setStatus('error');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-primary mb-2">10x</h1>
          <p className="text-gray-400">Authorize your CLI</p>
        </div>

        {status === 'success' ? (
          <div className="bg-green-900/30 border border-green-500 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-green-400 mb-2">Device Authorized</h2>
            <p className="text-gray-400">
              You can now return to your terminal. The CLI will be authenticated shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                Enter the code shown in your terminal
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-mono tracking-wider focus:outline-none focus:border-brand-primary"
                maxLength={9}
                autoFocus
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-400">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={code.length < 8 || status === 'loading'}
              className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-dark disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {status === 'loading' ? 'Authorizing...' : 'Authorize Device'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          Need help? Run <code className="text-brand-primary">10x --help</code> in your terminal.
        </p>
      </div>
    </main>
  );
}
