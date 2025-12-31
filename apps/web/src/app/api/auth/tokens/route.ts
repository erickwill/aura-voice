import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db, apiTokens } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/tokens
 * List all API tokens for the authenticated user
 */
export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, user.id))
      .orderBy(apiTokens.createdAt);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Failed to list tokens:', error);
    return NextResponse.json(
      { error: 'Failed to list tokens' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/tokens
 * Create a new API token
 */
export async function POST(request: NextRequest) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token name is required' },
        { status: 400 }
      );
    }

    // Generate a secure token with 10x_ prefix
    const tokenValue = `10x_${randomBytes(32).toString('hex')}`;

    // Insert the token
    const [newToken] = await db
      .insert(apiTokens)
      .values({
        userId: user.id,
        name: name.trim(),
        token: tokenValue,
      })
      .returning({
        id: apiTokens.id,
        name: apiTokens.name,
        createdAt: apiTokens.createdAt,
      });

    // Return the full token only once (on creation)
    return NextResponse.json({
      ...newToken,
      token: tokenValue,
    });
  } catch (error) {
    console.error('Failed to create token:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
