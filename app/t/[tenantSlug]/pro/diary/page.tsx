import { db } from '@/db'
import { counselorDiaries } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'
import { toMemberScope, hasElevatedScope } from '@/lib/member-scope'
import type { TenantAppRole } from '@/lib/tenant-membership'
import AdminDiaryPage from '@/app/t/[tenantSlug]/admin/diary/page'
import ProDiaryClient from './ProDiaryClient'

export default async function ProDiaryPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const ctx = await requireTenantSession()
  
  const isElevated = hasElevatedScope(
    toMemberScope({ 
      role: ctx.role as TenantAppRole, 
      dbUserId: ctx.dbUserId, 
      customRoleId: ctx.customRoleId, 
      permissions: ctx.permissions 
    })
  )

  if (isElevated) {
    return <AdminDiaryPage searchParams={props.searchParams} />
  }

  const diariesRaw = await db
    .select()
    .from(counselorDiaries)
    .where(
      and(
        eq(counselorDiaries.tenantId, ctx.tenant.id),
        eq(counselorDiaries.userId, ctx.dbUserId)
      )
    )
    .orderBy(desc(counselorDiaries.diaryDate), desc(counselorDiaries.createdAt))

  const diaries = diariesRaw.map(d => ({
    id: d.id,
    diaryDate: d.diaryDate,
    startTime: d.startTime,
    endTime: d.endTime,
    content: d.content,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My Notes &amp; Diaries</h1>
        <p className="text-sm text-slate-500 mt-1">Log your daily activities and consultancy work.</p>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <ProDiaryClient diaries={diaries} />
      </div>
    </div>
  )
}
