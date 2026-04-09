/** E.g. `localhost:3000` or `educrm.com` (no protocol). Used for subdomain workspace links. */
export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
}

export function workspaceOrigin(tenantSlug: string): string {
  const root = getRootDomain()
  const protocol = root.split(':')[0].includes('localhost') ? 'http' : 'https'
  return `${protocol}://${tenantSlug}.${root}`
}
