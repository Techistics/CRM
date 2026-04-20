import { NextResponse } from 'next/server'

export type ApiResponse<T = any> = 
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function errorResponse(error: string, code?: string, status = 400) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

export async function withApiErrorHandling<T>(fn: () => Promise<NextResponse>) {
  try {
    return await fn()
  } catch (error: any) {
    console.error('[API_ERROR]', error)
    return errorResponse(
      error.message || 'Internal Server Error',
      error.code || 'INTERNAL_ERROR',
      500
    )
  }
}
