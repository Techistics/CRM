'use client'

import { deleteWorkspaceAction } from '@/app/platform/actions'

export function DeleteTenantButton({ tenantId }: { tenantId: string }) {
  return (
    <form action={deleteWorkspaceAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <button
        type="submit"
        className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5"
        onClick={(e) => {
          if (
            !confirm(
              'Are you sure you want to delete this workspace? This action is reversible by an engineer but will hide the workspace from all users.'
            )
          ) {
            e.preventDefault()
          }
        }}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete
      </button>
    </form>
  )
}
