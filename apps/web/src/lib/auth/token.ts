import { eq } from 'drizzle-orm';
import { db, apiTokens } from '@/lib/db';

export interface ValidatedUser {
  id: string;
}

/**
 * Validate an API token and return the associated user ID
 * Note: With Supabase Auth, user details (email, name) are managed by Supabase.
 * For API token auth, we only need the user ID to check subscriptions and usage.
 */
export async function validateApiToken(token: string): Promise<ValidatedUser | null> {
  if (!token || !token.startsWith('10x_')) {
    return null;
  }

  try {
    // Find the token
    const [tokenRecord] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.token, token))
      .limit(1);

    if (!tokenRecord) {
      return null;
    }

    // Check if token is expired
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, tokenRecord.id));

    return {
      id: tokenRecord.userId,
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Revoke an API token
 */
export async function revokeApiToken(tokenId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(apiTokens)
      .where(eq(apiTokens.id, tokenId))
      .returning();

    // Verify the token belonged to the user
    if (result.length > 0 && result[0].userId !== userId) {
      console.error('Token did not belong to user');
      return false;
    }

    return result.length > 0;
  } catch (error) {
    console.error('Token revocation error:', error);
    return false;
  }
}

/**
 * List all API tokens for a user
 */
export async function listApiTokens(userId: string): Promise<Array<{
  id: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}>> {
  try {
    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, userId));

    return tokens;
  } catch (error) {
    console.error('List tokens error:', error);
    return [];
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
