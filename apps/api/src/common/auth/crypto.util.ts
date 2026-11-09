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

function getStatelessSessionKey(): string {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.CPF_HASH_PEPPER ||
    'bravo_ii_hml_internal_session_hmac_key_2026'
  );
}

export function generateCookieSessionToken(userId?: string): { rawToken: string; tokenHash: string } {
  let buf: Buffer;
  const cleanHex = userId ? userId.replace(/-/g, '').slice(-8) : '';
  if (/^[0-9a-fA-F]{8}$/.test(cleanHex)) {
    const header = Buffer.alloc(12);
    header.writeUInt32BE( parseInt(cleanHex, 16) >>> 0, 0);
    randomBytes(4).copy(header, 4);
    const expSec = Math.floor(Date.now() / 1000) + 8 * 3600;
    header.writeUInt32BE(expSec >>> 0, 8);
    const mac = createHmac('sha256', getStatelessSessionKey()).update(header).digest().subarray(0, 20);
    buf = Buffer.concat([header, mac]);
  } else {
    buf = randomBytes(32);
  }
  const rawToken = buf.toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

export function verifyStatelessCookieSessionToken(
  rawToken: string
): { userIdTailHex: string; expiresAtIso: string } | null {
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return null;
    const buf = Buffer.from(rawToken, 'base64url');
    if (buf.length !== 32) return null;
    const header = buf.subarray(0, 12);
    const providedMac = buf.subarray(12, 32);
    const expectedMac = createHmac('sha256', getStatelessSessionKey()).update(header).digest().subarray(0, 20);
    if (!timingSafeEqual(providedMac, expectedMac)) return null;
    const expSec = header.readUInt32BE(8);
    const nowSec = Math.floor(Date.now() / 1000);
    if (expSec <= nowSec) return null;
    const tailInt = header.readUInt32BE(0);
    const userIdTailHex = tailInt.toString(16).padStart(8, '0').toLowerCase();
    return {
      userIdTailHex,
      expiresAtIso: new Date(expSec * 1000).toISOString(),
    };
  } catch {
    return null;
  }
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
