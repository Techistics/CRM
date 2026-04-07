import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <SignUp
        path="/sign-up"
        routing="path"
        forceRedirectUrl="/"
        fallbackRedirectUrl="/"
        signInUrl="/sign-in"
      />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-primary hover:opacity-90">
          Sign in
        </Link>
      </p>
      <p className="mt-2 max-w-sm text-center text-xs text-muted-foreground">
        After you sign up, you’ll choose Pro or Admin and wait for an administrator to approve your access.
      </p>
    </main>
  )
}
