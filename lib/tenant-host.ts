/**
 * Resolve tenant slug from Host header for subdomain tenancy.
 * - Dev: `{slug}.localhost` (e.g. acme.localhost:3000 → acme)
 * - Prod: `{slug}.example.com` (first label unless www)
 */
export function tenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null
  const hostNoPort = hostHeader.split(':')[0].toLowerCase()
  if (hostNoPort === 'localhost' || hostNoPort === '127.0.0.1') return null

  const configuredRoot = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '')
    .split(':')[0]
    .toLowerCase()
    .trim()
  const isReservedSub = (sub: string) => !sub || sub === 'www'

  const parts = hostNoPort.split('.')
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    const sub = parts[0]
    if (isReservedSub(sub)) return null
    return sub
  }

  // Prefer explicit root-domain matching in production.
  // Example: root=crm.com => tenant host is {slug}.crm.com
  if (configuredRoot) {
    if (hostNoPort === configuredRoot) return null
    if (hostNoPort.endsWith(`.${configuredRoot}`)) {
      const sub = hostNoPort.slice(0, -(`.${configuredRoot}`.length))
      if (sub.includes('.')) return null
      if (isReservedSub(sub)) return null
      return sub
    }
    return null
  }

  // Safety: do not treat default Vercel domains as tenant hosts
  // when no root domain is configured.
  if (hostNoPort.endsWith('.vercel.app')) return null

  if (parts.length >= 3) {
    const sub = parts[0]
    if (isReservedSub(sub)) return null
    return sub
  }

  return null
}
