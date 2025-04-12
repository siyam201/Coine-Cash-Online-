import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { User } from '@shared/schema';
import { storage } from './storage';
import crypto from 'crypto';

// Generate a new secret for 2FA
export function generateSecret(email: string): string {
  return authenticator.generateSecret();
}

// Generate a QR code for the user to scan
export async function generateQRCode(user: User, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(user.email, 'Coine Cash Online', secret);
  return await toDataURL(otpauth);
}

// Verify TOTP token
export function verifyToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

// Generate recovery codes for backup access
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Generate a random 10-character code
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    // Format with a hyphen in the middle (e.g., ABCDE-FGHIJ)
    codes.push(`${code.substring(0, 5)}-${code.substring(5)}`);
  }
  return codes;
}

// Enable 2FA for a user
export async function enable2FA(userId: number, secret: string): Promise<User> {
  // Generate recovery codes
  const recoveryCodes = generateRecoveryCodes();
  
  // Update user with 2FA enabled and recovery codes
  const updatedUser = await storage.updateUser(userId, {
    twoFactorEnabled: true,
    twoFactorSecret: secret,
    recoveryCodesJson: recoveryCodes
  });
  
  return updatedUser!;
}

// Disable 2FA for a user
export async function disable2FA(userId: number): Promise<User> {
  const updatedUser = await storage.updateUser(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    recoveryCodesJson: null
  });
  
  return updatedUser!;
}

// Verify login with 2FA
export function verify2FALogin(user: User, token: string): boolean {
  if (!user.twoFactorSecret) {
    return false;
  }
  
  return authenticator.verify({ token, secret: user.twoFactorSecret });
}

// Use recovery code for 2FA
export async function useRecoveryCode(userId: number, code: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  
  if (!user || !user.recoveryCodesJson) {
    return false;
  }
  
  const recoveryCodes = user.recoveryCodesJson as string[];
  
  // Check if the code exists in the recovery codes
  const codeIndex = recoveryCodes.indexOf(code);
  if (codeIndex === -1) {
    return false;
  }
  
  // Remove the used code
  const updatedCodes = [...recoveryCodes];
  updatedCodes.splice(codeIndex, 1);
  
  // Update the user with the new set of recovery codes
  await storage.updateUser(userId, {
    recoveryCodesJson: updatedCodes
  });
  
  return true;
}