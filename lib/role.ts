import { getSession } from '@/lib/auth'

export type AppRole = 'super_admin' | 'tenant_admin' | 'agent'

export function normalizeAppRole(value: unknown): 'tenant_admin' | 'agent' | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if (v === 'tenant_admin' || v === 'agent') return v
  return undefined
}

export async function getUserRole(): Promise<AppRole | undefined> {
  const session = await getSession()
  return normalizeAppRole(session?.role)
}