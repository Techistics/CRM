/** E.g. `localhost:3000` or `devclystcrm.vercel.app` (no protocol). Used for workspace URLs. */
export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
}

export function workspaceOrigin(tenantSlug: string): string {
  const root = getRootDomain()
  const isLocalhost = root.includes('localhost')
  const protocol = isLocalhost ? 'http' : 'https'
  
  return `${protocol}://${root}/t/${tenantSlug}`
}
