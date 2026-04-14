'use client'

import { useActionState } from 'react'
import { signInAction } from '../actions'
import Link from 'next/link'

const initialState = { error: '' }

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in to your workspace.
        </p>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ali@acme.com"
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
              autoComplete="current-password"
              placeholder="Your password"
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
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/sign-up" className="font-medium text-primary hover:opacity-90">
            You need an invitation to sign up.
          </Link>
        </p>
      </div>
    </main>
  )
}