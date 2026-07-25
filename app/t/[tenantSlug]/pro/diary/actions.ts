'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { counselorDiaries } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function saveDiaryAction(data: {
  id?: string
  diaryDate: string
  startTime: string
  endTime: string
  content: string
}) {
  const ctx = await requireTenantSession()

  try {
    if (data.id) {
      await db
        .update(counselorDiaries)
        .set({
          diaryDate: data.diaryDate,
          startTime: data.startTime,
          endTime: data.endTime,
          content: data.content,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(counselorDiaries.id, data.id),
            eq(counselorDiaries.tenantId, ctx.tenant.id),
            eq(counselorDiaries.userId, ctx.dbUserId)
          )
        )
    } else {
      await db.insert(counselorDiaries).values({
        tenantId: ctx.tenant.id,
        userId: ctx.dbUserId,
        diaryDate: data.diaryDate,
        startTime: data.startTime,
        endTime: data.endTime,
        content: data.content,
      })
    }
    
    revalidatePath(`/t/${ctx.tenant.slug}/pro/diary`)
    return { ok: true }
  } catch (error: any) {
    console.error('Error saving diary:', error)
    return { ok: false, error: error.message || 'Failed to save' }
  }
}
