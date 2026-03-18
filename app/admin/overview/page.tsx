import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { db } from '@/db'
import { users } from '@/db/schema'

export default async function AdminOverviewPage() {
  const user = await currentUser()
  const allUsers = await db.select().from(users)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Admin dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {user?.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton />
        </div>
      </div>

      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-2">
        <p className="text-emerald-400 text-sm font-medium">
          ✓ Database connected — {allUsers.length} users in DB
        </p>
        <p className="text-gray-500 text-sm">
          Tables live: users, leads, lead_activities, csv_imports
        </p>
      </div>
    </div>
  )
}