import { createWorkspaceAction } from '@/app/platform/actions'
import { Building2 } from 'lucide-react'

const errorMessages: Record<string, string> = {
  'name-required': 'Organization name is required.',
  'invalid-slug': 'Subdomain slug is invalid.',
  'first-admin-email-required': 'First admin email is required.',
  'first-admin-email-invalid': 'First admin email is invalid.',
  'slug-in-use': 'This subdomain slug is already in use.',
  'create-failed': 'Could not create workspace. Please try again.',
}

export default async function NewWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? errorMessages[error] : null

  return (
    <div className="mx-auto mt-12 max-w-[520px]">
      <div className="rounded-[12px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-8 py-7">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(203,239,127,0.12)]">
            <Building2 className="h-5 w-5 text-[#CBEF7F]" />
          </div>
          <h1 className="mt-3 text-[18px] font-medium text-[var(--text-strong)]">New workspace</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-text)]">
            Create a new workspace and prepare it for team onboarding
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {errorMessage}
          </div>
        )}

        <form action={createWorkspaceAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-[12px] text-[var(--muted-text)]">
              Organization name
            </label>
            <input
              id="name"
              name="name"
              required
              className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none focus:border-[rgba(203,239,127,0.5)]"
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-[12px] text-[var(--muted-text)]">
              Subdomain slug
            </label>
            <input
              id="slug"
              name="slug"
              placeholder="acme"
              className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)] focus:border-[rgba(203,239,127,0.5)]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted-text)]">becomes slug.yourdomain.com</p>
          </div>

          <div>
            <label htmlFor="brandName" className="mb-1.5 block text-[12px] text-[var(--muted-text)]">
              Display name (optional)
            </label>
            <input
              id="brandName"
              name="brandName"
              className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none focus:border-[rgba(203,239,127,0.5)]"
            />
          </div>

          <div>
            <label htmlFor="firstAdminEmail" className="mb-1.5 block text-[12px] text-[var(--muted-text)]">
              First admin email
            </label>
            <input
              id="firstAdminEmail"
              name="firstAdminEmail"
              type="email"
              required
              placeholder="admin@company.com"
              className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)] focus:border-[rgba(203,239,127,0.5)]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted-text)]">
              We&apos;ll create a pending admin invite for this email.
            </p>
          </div>

          <button
            type="submit"
            className="mt-2 h-[42px] w-full rounded-[8px] bg-[#CBEF7F] text-[14px] font-medium text-[#2C5000]"
          >
            Create workspace
          </button>
        </form>
      </div>
    </div>
  )
}
