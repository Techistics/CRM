import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies the X-Hub-Signature-256 header sent by Meta on every webhook delivery.
 *
 * Header format:  "sha256=<hex-digest>"
 *
 * Guards:
 *   - Returns false immediately when META_APP_SECRET is not configured.
 *   - Returns false for a missing or malformed header.
 *   - Uses crypto.timingSafeEqual to prevent timing attacks.
 *   - Compares Buffer lengths before calling timingSafeEqual (required; the
 *     function throws if the two buffers differ in byte-length).
 *
 * @param rawBody  The raw request body string (must be read *before* JSON.parse).
 * @param header   The value of the X-Hub-Signature-256 request header, or null.
 */
export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret) {
    console.error('[verifyMetaSignature] META_APP_SECRET is not set')
    return false
  }

  if (!header || !header.startsWith('sha256=')) {
    return false
  }

  const receivedHex = header.slice('sha256='.length)

  // Reject anything that is not exactly 64 hex characters (= 32 bytes / SHA-256
  // digest length).  Buffer.from(str, 'hex') silently drops non-hex chars, so
  // without this guard a malformed even-length string could produce a buffer
  // shorter than 32 bytes and slip past the length check below.
  if (!/^[0-9a-f]{64}$/i.test(receivedHex)) {
    return false
  }

  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest()

  const received = Buffer.from(receivedHex, 'hex')

  // timingSafeEqual requires both buffers to have the same byte length.
  // This is now guaranteed by the regex above, but kept as a safety net.
  if (expected.length !== received.length) {
    return false
  }

  return timingSafeEqual(expected, received)
}
