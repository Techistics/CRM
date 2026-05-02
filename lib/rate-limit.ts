// Simple in-memory rate limiter using a sliding window or fixed window approach.
// In a highly distributed production environment, replace this with Redis (e.g. upstash/ratelimit).

type RateLimitInfo = {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitInfo>()

/**
 * Basic in-memory rate limiter to prevent Noisy Neighbor issues.
 * 
 * @param identifier A unique key to rate limit by (e.g., tenantId + IP)
 * @param limit Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up expired records to prevent memory leaks in the Map
  if (rateLimitMap.size > 10000) {
    const cutoff = now
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetAt < cutoff) {
        rateLimitMap.delete(key)
      }
    }
  }

  // If no record exists, or the time window has expired, reset it
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { success: true, remaining: limit - 1 }
  }

  // If they have exceeded the limit, reject
  if (record.count >= limit) {
    return { success: false, remaining: 0 }
  }

  // Otherwise, increment their request count
  record.count += 1
  rateLimitMap.set(identifier, record)
  
  return { success: true, remaining: limit - record.count }
}
