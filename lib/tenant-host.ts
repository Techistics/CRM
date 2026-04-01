/**
 * Resolve tenant slug from Host header for subdomain tenancy.
 * - Dev: `{slug}.localhost` (e.g. acme.localhost:3000 → acme)
 * - Prod: `{slug}.example.com` (first label unless www)
 */
export function tenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null
  const hostNoPort = hostHeader.split(':')[0].toLowerCase()
  if (hostNoPort === 'localhost' || hostNoPort === '127.0.0.1') return null

  const parts = hostNoPort.split('.')
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    const sub = parts[0]
    if (!sub || sub === 'www') return null
    return sub
  }

  if (parts.length >= 3) {
    const sub = parts[0]
    if (!sub || sub === 'www') return null
    return sub
  }

  return null
}
