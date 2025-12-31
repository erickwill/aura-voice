import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db, deviceCodes } from '@/lib/db';
import { getUser } from '@/lib/auth';

/**
 * POST /api/auth/device/confirm
 * Confirm a device code (called from web UI after user authenticates)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase session
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in to authorize a device' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_code } = body;

    if (!user_code) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'user_code is required' },
        { status: 400 }
      );
    }

    // Normalize the user code (remove dashes, uppercase)
    const normalizedCode = user_code.replace(/-/g, '').toUpperCase();

    // Find the device code - must be unexpired and not already confirmed
    const result = await db
      .update(deviceCodes)
      .set({
        userId: user.id,
        confirmedAt: new Date(),
      })
      .where(
        and(
          eq(deviceCodes.userCode, normalizedCode),
          gt(deviceCodes.expiresAt, new Date()),
          isNull(deviceCodes.confirmedAt)
        )
      )
      .returning();

    if (result.length === 0) {
      // Check if code exists but is already confirmed
      const existing = await db
        .select()
        .from(deviceCodes)
        .where(eq(deviceCodes.userCode, normalizedCode))
        .limit(1);

      if (existing.length > 0 && existing[0].confirmedAt) {
        return NextResponse.json(
          { error: 'already_confirmed', message: 'This code has already been used' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'invalid_code', message: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device authorized successfully. You can close this window.',
    });
  } catch (error) {
    console.error('Device confirm error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to confirm device' },
      { status: 500 }
    );
  }
}
