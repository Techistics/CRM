'use client'

import { deleteWorkspaceAction } from '@/app/platform/actions'

export function DeleteTenantButton({ tenantId }: { tenantId: string }) {
  return (
    <form action={deleteWorkspaceAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <button
        type="submit"
        className="rounded-[8px] border-[0.5px] border-[rgba(226,75,74,0.3)] bg-transparent px-3 py-1.5 text-[12px] text-[#E24B4A]"
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
        Delete
      </button>
    </form>
  )
}
