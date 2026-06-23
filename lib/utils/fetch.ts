'use client'

declare global {
  interface Window {
    __crmFetchPatched?: boolean
  }
}

export function initFetchInterceptor() {
  if (typeof window === 'undefined' || window.__crmFetchPatched) return

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    try {
      const res = await originalFetch(...args)
      if (res.status >= 400) {
        const body = await res.clone().json().catch(() => ({} as Record<string, unknown>))
        const bodyMessage =
          typeof body?.message === 'string'
            ? body.message
            : typeof body?.error === 'string'
              ? body.error
              : null
        const msg = bodyMessage ?? `Request failed: ${res.status}`
        const error = new Error(msg) as Error & { status?: number }
        error.status = res.status
        throw error
      }
      return res
    } catch (err) {
      throw err
    }
  }

  window.__crmFetchPatched = true
}
