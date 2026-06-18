/**
 * lib/totp.ts
 *
 * TOTP helpers for SUPER_ADMIN MFA.
 *
 * Secret storage: AES-256-GCM, key from TOTP_ENCRYPTION_KEY env var.
 * MFA tokens: short-lived (5 min) signed JWTs, separate from session tokens.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { generateSecret, verifySync } from 'otplib'

import { env } from '@/lib/env'

// ── AES-256-GCM helpers ──────────────────────────────────────────────────────

const ALGO = 'aes-256-gcm'

function getEncKey(): Buffer {
  return Buffer.from(env.TOTP_ENCRYPTION_KEY, 'hex')
}

/**
 * Encrypts a TOTP secret string using AES-256-GCM.
 * Returns a colon-separated string: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encryptSecret(secret: string): string {
  const key = getEncKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGO, key, iv)

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts an AES-256-GCM encrypted TOTP secret.
 * Expects format: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function decryptSecret(encrypted: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted secret format')
  }

  const key = getEncKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// ── MFA token helpers (short-lived JWT) ──────────────────────────────────────

const MFA_TOKEN_TTL = '5m'
// Re-use JWT_SECRET — the token payload is distinct enough (contains "mfa" claim)
const mfaKey = new TextEncoder().encode(env.JWT_SECRET)

export type MfaTokenPayload = {
  sub: string    // userId
  purpose: 'mfa' // prevents reuse as a session token
}

/** Signs a 5-minute MFA challenge token containing only the userId. */
export async function signMfaToken(userId: string): Promise<string> {
  return await new SignJWT({ purpose: 'mfa' } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(MFA_TOKEN_TTL)
    .sign(mfaKey)
}

/**
 * Verifies an MFA token and returns the userId.
 * Returns null if invalid, expired, or wrong purpose.
 */
export async function verifyMfaToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, mfaKey, { algorithms: ['HS256'] })
    if (payload.purpose !== 'mfa' || typeof payload.sub !== 'string') return null
    return payload.sub
  } catch {
    return null
  }
}

// ── TOTP verification wrapper ─────────────────────────────────────────────────

/**
 * Verifies a 6-digit TOTP code against a plaintext secret.
 * Uses epochTolerance to tolerate minor clock skew (±30s).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const result = verifySync({
    secret,
    token: code,
    epochTolerance: 30, // equivalent to ±30 seconds (1 period window)
  })
  return result.valid
}

/**
 * Generates a new TOTP secret. Returns the plaintext secret
 * (caller is responsible for encrypting before persistence).
 */
export function generateTotpSecret(): string {
  return generateSecret()
}
