import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = 
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function errorResponse(error: string, code?: string, status = 400) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

export async function withApiErrorHandling(fn: () => Promise<NextResponse>) {
  try {
    return await fn()
  } catch (error: unknown) {
    console.error('[API_ERROR]', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const code = (error as { code?: string })?.code || 'INTERNAL_ERROR'
    return errorResponse(message, code, 500)
  }
}
