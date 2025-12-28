import { NextRequest, NextResponse } from 'next/server';
import { db, deviceCodes } from '@/lib/db';
import {
  generateUserCode,
  generateDeviceCode,
  DEVICE_CODE_EXPIRY_MS,
  DEVICE_CODE_POLL_INTERVAL_MS,
} from '@/lib/auth/device';

/**
 * POST /api/auth/device
 * Start a device auth flow - returns user_code and device_code
 */
export async function POST(request: NextRequest) {
  try {
    const userCode = generateUserCode();
    const deviceCode = generateDeviceCode();
    const expiresAt = new Date(Date.now() + DEVICE_CODE_EXPIRY_MS);

    // Store in database
    await db.insert(deviceCodes).values({
      userCode,
      deviceCode,
      expiresAt,
    });

    return NextResponse.json({
      user_code: userCode,
      device_code: deviceCode,
      verification_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/device`,
      expires_in: DEVICE_CODE_EXPIRY_MS / 1000,
      interval: DEVICE_CODE_POLL_INTERVAL_MS / 1000,
    });
  } catch (error) {
    console.error('Device auth error:', error);
    return NextResponse.json(
      { error: 'Failed to create device code' },
      { status: 500 }
    );
  }
}
