/** Path under path-based tenancy: `/t/{slug}/admin/...` on the apex host. */
export function tenantPath(tenantSlug: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `/t/${tenantSlug}${p}`
}
