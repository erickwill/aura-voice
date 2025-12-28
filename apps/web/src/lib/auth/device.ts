import { randomBytes } from 'crypto';

/**
 * Generate a user-friendly device code (e.g., ABCD-1234)
 */
export function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a secure device code for API use
 */
export function generateDeviceCode(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a secure API token
 */
export function generateApiToken(): string {
  return `10x_${randomBytes(32).toString('hex')}`;
}

/**
 * Device code expiration time (15 minutes)
 */
export const DEVICE_CODE_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Polling interval for device code (5 seconds)
 */
export const DEVICE_CODE_POLL_INTERVAL_MS = 5 * 1000;
