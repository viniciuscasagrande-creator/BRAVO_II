import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (typeof plainPassword !== 'string' || plainPassword.length > 256) {
    return false;
  }
  if (storedHash.startsWith('scrypt$v1$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') {
      return false;
    }
    const stored = Buffer.from(parts[3], 'base64url');
    if (stored.length !== 64) {
      return false;
    }
    const derived = scryptSync(plainPassword, parts[2], 64);
    return timingSafeEqual(stored, derived);
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, keyHex] = parts;
  const expectedBuffer = Buffer.from(keyHex, 'hex');
  const actualBuffer = scryptSync(plainPassword, salt, 64);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

export function generateCookieSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function csrfForToken(token: string): string {
  return createHmac('sha256', token).update('bravo-ii:csrf:v1').digest('hex');
}

export function compareSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
