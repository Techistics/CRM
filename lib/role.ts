import { currentUser } from '@clerk/nextjs/server'

export type AppRole = 'admin' | 'pro'

export async function getUserRole(): Promise<AppRole | undefined> {
  const user = await currentUser()
  const role =
    (user?.publicMetadata?.role as AppRole | undefined) ??
    (user?.unsafeMetadata?.role as AppRole | undefined)

  return role
}


