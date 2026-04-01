import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { AuthToastWrapper } from '@/components/auth-toast-wrapper'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/sign-in"
        >
          <AuthToastWrapper />
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  )
}