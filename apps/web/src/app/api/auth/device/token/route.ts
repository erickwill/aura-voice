import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db, deviceCodes, apiTokens } from '@/lib/db';
import { generateApiToken } from '@/lib/auth/device';

/**
 * POST /api/auth/device/token
 * Poll for token after device code is confirmed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code } = body;

    if (!device_code) {
      return NextResponse.json(
        { error: 'device_code is required' },
        { status: 400 }
      );
    }

    // Find the device code
    const result = await db
      .select()
      .from(deviceCodes)
      .where(
        and(
          eq(deviceCodes.deviceCode, device_code),
          gt(deviceCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    const deviceCodeRecord = result[0];

    if (!deviceCodeRecord) {
      return NextResponse.json(
        { error: 'expired_token', error_description: 'Device code expired or not found' },
        { status: 400 }
      );
    }

    // Check if confirmed
    if (!deviceCodeRecord.confirmedAt || !deviceCodeRecord.userId) {
      return NextResponse.json(
        { error: 'authorization_pending', error_description: 'Waiting for user authorization' },
        { status: 400 }
      );
    }

    // Generate API token
    const token = generateApiToken();

    await db.insert(apiTokens).values({
      userId: deviceCodeRecord.userId,
      token,
      name: 'CLI Device',
    });

    // Delete the device code (one-time use)
    await db.delete(deviceCodes).where(eq(deviceCodes.id, deviceCodeRecord.id));

    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
    });
  } catch (error) {
    console.error('Token poll error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to process token request' },
      { status: 500 }
    );
  }
}
