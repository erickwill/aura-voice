'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

interface ApiToken {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  token?: string; // Only present when just created
}

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    init();
  }, [supabase.auth]);

  useEffect(() => {
    fetchTokens();
  }, []);

  async function fetchTokens() {
    try {
      const res = await fetch('/api/auth/tokens');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createToken() {
    if (!newTokenName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedToken(data.token);
        setNewTokenName('');
        fetchTokens();
      }
    } catch (error) {
      console.error('Failed to create token:', error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteToken(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/auth/tokens/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete token:', error);
    } finally {
      setDeletingId(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatRelativeTime(dateStr: string | null) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateStr);
  }

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">
          Manage your account and API tokens
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
        <h2 className="text-xl font-semibold mb-6">Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Name</label>
            <p className="text-white">{userName || 'Not set'}</p>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Email</label>
            <p className="text-white">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* API Tokens */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">API Tokens</h2>
            <p className="text-gray-400 text-sm mt-1">
              Use API tokens to authenticate the 10x CLI
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-colors"
          >
            Create Token
          </button>
        </div>

        {/* Newly created token notice */}
        {newlyCreatedToken && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm mb-2">
              Token created successfully! Copy it now - you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black px-3 py-2 rounded font-mono text-sm text-green-400 break-all">
                {newlyCreatedToken}
              </code>
              <button
                onClick={() => copyToClipboard(newlyCreatedToken)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewlyCreatedToken(null)}
              className="mt-3 text-gray-400 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-2">No API tokens yet</p>
            <p className="text-sm">Create a token to authenticate the 10x CLI</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{token.name}</p>
                  <p className="text-gray-400 text-sm">
                    Created {formatDate(token.createdAt)} • Last used: {formatRelativeTime(token.lastUsedAt)}
                  </p>
                </div>
                <button
                  onClick={() => deleteToken(token.id)}
                  disabled={deletingId === token.id}
                  className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                >
                  {deletingId === token.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create API Token</h3>
            <p className="text-gray-400 text-sm mb-4">
              Give your token a descriptive name so you can identify it later.
            </p>
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="e.g., MacBook Pro, Work Laptop"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createToken();
                  setShowCreateModal(false);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTokenName('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createToken();
                  setShowCreateModal(false);
                }}
                disabled={!newTokenName.trim() || creating}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLI Usage Instructions */}
      <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Using API Tokens</h2>
        <p className="text-gray-400 mb-4">
          Instead of using API tokens directly, we recommend authenticating with your 10x account:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>Run <code className="bg-gray-800 px-2 py-0.5 rounded text-green-400">10x</code> in your terminal</li>
          <li>Select &quot;Sign in with 10x&quot; when prompted</li>
          <li>Complete authentication in your browser</li>
          <li>The CLI will automatically receive your credentials</li>
        </ol>
        <p className="text-gray-400 mt-4 text-sm">
          API tokens are primarily used for automated systems or when browser authentication isn&apos;t available.
        </p>
      </div>
    </div>
  );
}
