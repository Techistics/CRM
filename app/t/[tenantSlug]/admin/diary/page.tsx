import { db } from '@/db'
import { counselorDiaries, users } from '@/db/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { requireTenantAdminSession } from '@/lib/tenant-server'
import AdminDiaryClient from './AdminDiaryClient'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export default async function AdminDiaryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const ctx = await requireTenantAdminSession()

  const resolvedParams = searchParams ? await searchParams : {}
  const fromParam = typeof resolvedParams.from === 'string' ? resolvedParams.from : undefined
  const toParam = typeof resolvedParams.to === 'string' ? resolvedParams.to : undefined
  const counselorId = typeof resolvedParams.counselor === 'string' ? resolvedParams.counselor : undefined

  const fromDate = fromParam ? new Date(fromParam) : subDays(new Date(), 30)
  const toDate = toParam ? new Date(toParam) : new Date()

  const conditions = [
    eq(counselorDiaries.tenantId, ctx.tenant.id),
    gte(counselorDiaries.diaryDate, startOfDay(fromDate).toISOString().split('T')[0]),
    lte(counselorDiaries.diaryDate, endOfDay(toDate).toISOString().split('T')[0]),
  ]

  if (counselorId && counselorId !== 'all') {
    conditions.push(eq(counselorDiaries.userId, counselorId))
  }

  const diariesRaw = await db
    .select({
      id: counselorDiaries.id,
      diaryDate: counselorDiaries.diaryDate,
      startTime: counselorDiaries.startTime,
      endTime: counselorDiaries.endTime,
      content: counselorDiaries.content,
      createdAt: counselorDiaries.createdAt,
      counselorName: users.name,
      counselorEmail: users.email,
    })
    .from(counselorDiaries)
    .innerJoin(users, eq(users.id, counselorDiaries.userId))
    .where(and(...conditions))
    .orderBy(desc(counselorDiaries.diaryDate), desc(counselorDiaries.createdAt))

  const diaries = diariesRaw.map(d => ({
    id: d.id,
    counselorName: d.counselorName || 'Unknown',
    counselorEmail: d.counselorEmail,
    diaryDate: d.diaryDate,
    startTime: d.startTime,
    endTime: d.endTime,
    content: d.content,
    createdAt: d.createdAt.toISOString(),
  }))

  const tenantMembersRaw = await db.query.tenantMembers.findMany({
    where: (t, { eq, and }) => and(eq(t.tenantId, ctx.tenant.id), eq(t.role, 'PRO')),
    with: {
      user: {
        columns: { id: true, name: true, email: true }
      }
    }
  })

  const counselors = tenantMembersRaw.map(m => ({
    id: m.userId,
    name: m.user?.name || 'Unknown',
    email: m.user?.email || ''
  }))

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Counselor Diaries</h1>
        <p className="text-sm text-slate-500 mt-1">Review daily notes and consultancy logs from your team.</p>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <AdminDiaryClient 
          diaries={diaries} 
          counselors={counselors} 
          initialFilters={{ from: fromDate.toISOString(), to: toDate.toISOString(), counselor: counselorId || 'all' }}
        />
      </div>
    </div>
  )
}
