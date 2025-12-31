import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db, deviceCodes, apiTokens } from '@/lib/db';
import { generateApiToken } from '@/lib/auth/device';

/**
 * POST /api/auth/device/token
 * Poll for token after device code is confirmed
 *
 * This endpoint is called by the CLI to check if the user has confirmed
 * the device code in their browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceCode } = body;

    if (!deviceCode) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'deviceCode is required' },
        { status: 400 }
      );
    }

    // Find the device code
    const result = await db
      .select()
      .from(deviceCodes)
      .where(eq(deviceCodes.deviceCode, deviceCode))
      .limit(1);

    const deviceCodeRecord = result[0];

    if (!deviceCodeRecord) {
      return NextResponse.json(
        { error: 'invalid_code', message: 'Device code not found' },
        { status: 400 }
      );
    }

    // Check if expired
    if (deviceCodeRecord.expiresAt < new Date()) {
      // Clean up expired code
      await db.delete(deviceCodes).where(eq(deviceCodes.id, deviceCodeRecord.id));

      return NextResponse.json(
        { error: 'expired_token', message: 'Device code has expired' },
        { status: 400 }
      );
    }

    // Check if confirmed
    if (!deviceCodeRecord.confirmedAt || !deviceCodeRecord.userId) {
      return NextResponse.json(
        { error: 'authorization_pending', message: 'Waiting for user authorization' },
        { status: 400 }
      );
    }

    // Generate API token for the CLI
    const token = generateApiToken();

    // Store the token
    await db.insert(apiTokens).values({
      userId: deviceCodeRecord.userId,
      token,
      name: 'CLI Device Auth',
    });

    // Delete the device code (one-time use)
    await db.delete(deviceCodes).where(eq(deviceCodes.id, deviceCodeRecord.id));

    return NextResponse.json({
      accessToken: token,
      expiresAt: null, // Token doesn't expire by default
    });
  } catch (error) {
    console.error('Token poll error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to process token request' },
      { status: 500 }
    );
  }
}
