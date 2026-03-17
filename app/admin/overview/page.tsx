import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

export default async function AdminOverviewPage() {
  const user = await currentUser()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Admin dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</span>
          <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: '0' },
          { label: 'Active', value: '0' },
          { label: 'Converted', value: '0' },
          { label: 'Revenue', value: '$0' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-semibold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-emerald-400 text-sm font-medium">✓ Admin portal is working</p>
        <p className="text-gray-500 text-sm mt-1">Role: admin — DB connection comes in Step 3</p>
      </div>
    </div>
  )
}