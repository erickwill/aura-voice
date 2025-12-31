import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db, apiTokens } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/auth/tokens/[id]
 * Delete an API token
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    // Delete the token (only if it belongs to the user)
    const result = await db
      .delete(apiTokens)
      .where(
        and(
          eq(apiTokens.id, id),
          eq(apiTokens.userId, user.id)
        )
      )
      .returning({ id: apiTokens.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete token:', error);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
