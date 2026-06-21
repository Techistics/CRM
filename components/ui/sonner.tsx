'use client'

import * as React from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--card-bg)',
          border: '0.5px solid var(--card-border-color)',
          color: 'var(--text-strong)',
          borderRadius: '10px',
          fontSize: '13px',
          fontFamily: 'var(--font-app)',
          boxShadow: 'none',
          padding: '12px 16px',
        },
        classNames: {
          description: 'text-[var(--muted-text)]',
          actionButton: 'bg-[#0DA2E7] text-[#2C5000]',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
