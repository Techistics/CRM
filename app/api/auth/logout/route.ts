import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/lib/auth'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST() {
  return withApiErrorHandling(async () => {
    await logout()
    return successResponse({ success: true })
  })
}

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    await logout()
    const url = new URL(req.url)
    return NextResponse.redirect(new URL('/sign-in', url.origin))
  })
}
