import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db, deviceCodes } from '@/lib/db';
// import { auth } from '@/lib/auth'; // TODO: integrate with NextAuth

/**
 * POST /api/auth/device/confirm
 * Confirm a device code (called from web UI after user authenticates)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_code, user_id } = body;

    if (!user_code) {
      return NextResponse.json(
        { error: 'user_code is required' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      );
    }

    // Find and update the device code
    const result = await db
      .update(deviceCodes)
      .set({
        userId: user_id,
        confirmedAt: new Date(),
      })
      .where(
        and(
          eq(deviceCodes.userCode, user_code.toUpperCase()),
          gt(deviceCodes.expiresAt, new Date())
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Device confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm device' },
      { status: 500 }
    );
  }
}
