'use client'

import { useEffect } from 'react'

import { initFetchInterceptor } from '@/lib/utils/fetch'

export function FetchInterceptor() {
  useEffect(() => {
    initFetchInterceptor()
  }, [])

  return null
}
