import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthToastWrapper } from '@/components/auth-toast-wrapper'
import { FetchInterceptor } from '@/components/FetchInterceptor'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consulty',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(() => {
          try {
            const s = localStorage.getItem('crm-theme');
            const dark = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', dark);
          } catch {}
        })();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthToastWrapper />
        <FetchInterceptor />
        <Analytics />
        <SpeedInsights />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}