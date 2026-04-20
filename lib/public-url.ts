/** E.g. `localhost:3000` or `devclystcrm.vercel.app` (no protocol). Used for workspace URLs. */
/** E.g. `localhost:5000` or `devclystcrm.vercel.app`. Used for absolute URLs in emails etc. */
export function getRootOrigin(): string {
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
  }
  return `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'devclystcrm.vercel.app'}`
}

/** 
 * Returns a relative path for workspace navigation to stay on the current origin.
 * Path-based tenancy on the apex host ensures this works in all environments.
 */
export function workspaceOrigin(tenantSlug: string): string {
  return `/t/${tenantSlug}`
}
