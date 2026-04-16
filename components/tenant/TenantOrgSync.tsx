'use client'

/**
 * TenantOrgSync — previously used Clerk's useOrganizationList to switch the
 * active Clerk org when navigating between tenant subdomains. With Clerk
 * removed, tenant context is now carried in the JWT session cookie instead,
 * so this component is intentionally a no-op.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TenantOrgSync(_props: { clerkOrgId: string }) {
  return null
}
