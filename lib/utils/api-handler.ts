'use client'

import { toast } from 'sonner'

type ApiCallOptions<T> = {
  loadingMsg?: string
  successMsg?: string
  errorMsg?: string
  onSuccess?: (data: T) => void
  onError?: (err: unknown) => void
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection'
  }

  if (err instanceof Error) {
    const status = (err as { status?: number }).status
    const message = err.message
    const isGeneric =
      !message ||
      message === 'Unauthorized' ||
      message === 'Forbidden' ||
      message === 'Not Found' ||
      message.startsWith('Request failed:')

    if (!isGeneric) return message

    if (status === 401) return 'Session expired, please log in'
    if (status === 403) return "You don't have permission to do this"
    if (status === 404) return 'Resource not found'
    if (status === 500) return 'Server error, please try again'

    // Only match prefix patterns if status is undefined, to avoid matching UUIDs or query strings
    if (status === undefined) {
      if (message.startsWith('Request failed: 401')) return 'Session expired, please log in'
      if (message.startsWith('Request failed: 403')) return "You don't have permission to do this"
      if (message.startsWith('Request failed: 404')) return 'Resource not found'
      if (message.startsWith('Request failed: 500')) return 'Server error, please try again'
    }

    return message
  }

  return fallback
}

export async function apiCall<T>(
  fn: () => Promise<T>,
  options?: ApiCallOptions<T>,
): Promise<T | null> {
  const loadingToastId = options?.loadingMsg
    ? toast.loading(options.loadingMsg)
    : null

  try {
    const data = await fn()

    if (loadingToastId) toast.dismiss(loadingToastId)
    if (options?.successMsg) toast.success(options.successMsg)
    options?.onSuccess?.(data)

    return data
  } catch (err: unknown) {
    if (loadingToastId) toast.dismiss(loadingToastId)
    const message = getErrorMessage(err, options?.errorMsg ?? 'Something went wrong')
    toast.error(message)
    options?.onError?.(err)
    console.error('[apiCall error]', err)
    return null
  }
}
