import { db } from '@/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST() {
  return withApiErrorHandling(async () => {
    console.log('Creating tenant with slug "0"...')

    // Check if tenant already exists
    const [existing] = await db.select().from(tenants).where(eq(tenants.slug, '0')).limit(1)
    
    if (existing) {
      return successResponse({ 
        message: 'Tenant with slug "0" already exists', 
        tenant: existing 
      })
    }

    // Create new tenant
    const newTenant = {
      id: randomUUID(),
      slug: '0',
      name: 'Zero Tenant',
      status: 'active' as const,
      settings: {},
    }

    const [created] = await db.insert(tenants).values(newTenant).returning()
    
    return successResponse({ 
      message: 'Successfully created tenant', 
      tenant: created 
    }, 201)
  })
}
