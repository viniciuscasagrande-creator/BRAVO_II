import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionToken, hashPassword, hashSessionToken, verifyPassword } from './crypto.util';

describe('Crypto Utils (Unit)', () => {
  it('gera hash scrypt único com salt e verifica senha corretamente', () => {
    const hash1 = hashPassword('SenhaSegura#2026');
    const hash2 = hashPassword('SenhaSegura#2026');
    assert.notEqual(hash1, hash2);
    assert.equal(verifyPassword('SenhaSegura#2026', hash1), true);
    assert.equal(verifyPassword('SenhaErrada#2026', hash1), false);
  });

  it('gera token de sessão de alta entropia e calcula hash SHA-256 determinístico', () => {
    const { rawToken, tokenHash } = generateSessionToken();
    assert.equal(rawToken.length, 64);
    assert.equal(hashSessionToken(rawToken), tokenHash);
  });
});
