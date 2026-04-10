import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    console.log('Creating tenant with slug "0"...')

    // Check if tenant already exists
    const existing = await db.select().from(tenants).where(eq(tenants.slug, '0')).limit(1)
    
    if (existing.length > 0) {
      return NextResponse.json({ 
        message: 'Tenant with slug "0" already exists', 
        tenant: existing[0] 
      })
    }

    // Create new tenant
    const newTenant = {
      id: randomUUID(),
      slug: '0',
      name: 'Zero Tenant',
      clerkOrgId: `org_${randomUUID()}`, // You'll need to update this with actual Clerk Org ID
      status: 'active' as const,
      settings: {},
    }

    const result = await db.insert(tenants).values(newTenant).returning()
    
    return NextResponse.json({ 
      message: 'Successfully created tenant', 
      tenant: result[0] 
    })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ 
      error: 'Failed to create tenant', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
