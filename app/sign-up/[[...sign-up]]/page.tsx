'use client'

import { useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { acceptInviteAction } from '../actions'
import Link from 'next/link'

const initialState = { error: '' }

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const emailFromUrl = searchParams.get('email') ?? ''

  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState)
  const [invalidLink] = useState(() => !token)

  if (invalidLink) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm text-center">
          <h1 className="mb-2 text-xl font-semibold tracking-tight">Invalid invitation</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This link is invalid or has expired. Please ask your administrator to send a new invitation.
          </p>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-primary hover:opacity-90"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Accept your invitation</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Create your account to join your team's workspace.
        </p>

        <form action={formAction} className="space-y-4">
          {/* Hidden token */}
          <input type="hidden" name="token" value={token ?? ''} />

          {/* Email — pre-filled, read only */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={emailFromUrl}
              readOnly
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              This email was used for your invitation and cannot be changed.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ali Hassan"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:opacity-90">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}