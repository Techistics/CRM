'use client'

import { createWorkspaceAction } from '@/app/platform/actions'
import { Building2, Loader2 } from 'lucide-react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

const errorMessages: Record<string, string> = {
  'name-required': 'Organization name is required.',
  'invalid-slug': 'Subdomain slug is invalid.',
  'first-admin-email-required': 'First admin email is required.',
  'first-admin-email-invalid': 'First admin email is invalid.',
  'slug-in-use': 'This subdomain slug is already in use.',
  'create-failed': 'Could not create workspace. Please try again.',
}

// Separate button component to tap into Next.js automatic form submission state
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#0DA2E7] tex#0DA2E7t-[14px] font-medium text-[#2C5000] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Creating workspace...</span>
        </>
      ) : (
        <span>Create workspace</span>
      )}
    </button>
  )
}

export default function NewWorkspacePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : null

  return (
    <div className="mx-auto mt-2 max-w-[520px]">
      <div className="rounded-[12px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-8 py-7">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(203,239,127,0.12)]">
            <Building2 className="h-5 w-5 text-[#0DA2E7]" />
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
          {/* We wrap inputs in a FormStatusAware Fieldset helper */}
          <FieldsetWrapper>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[12px] text-[var(--muted-text)]">
                Organization name
              </label>
              <input
                id="name"
                name="name"
                required
                className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none focus:border-[rgba(203,239,127,0.5)] disabled:opacity-60"
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
                className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)] focus:border-[rgba(203,239,127,0.5)] disabled:opacity-60"
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
                className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none focus:border-[rgba(203,239,127,0.5)] disabled:opacity-60"
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
                className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)] focus:border-[rgba(203,239,127,0.5)] disabled:opacity-60"
              />
              <p className="mt-1.5 text-[11px] text-[var(--muted-text)]">
                We&apos;ll create a pending admin invite for this email.
              </p>
            </div>
          </FieldsetWrapper>

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}

// Utility wrapper to seamlessly disable all form fields while Server Action is resolving
function FieldsetWrapper({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <fieldset disabled={pending} className="space-y-4 disabled:pointer-events-none">
      {children}
    </fieldset>
  )
}