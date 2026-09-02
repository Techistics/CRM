import './globals.css'
import { DM_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthToastWrapper } from '@/components/auth-toast-wrapper'
import { FetchInterceptor } from '@/components/FetchInterceptor'
import { TooltipProvider } from '@/components/ui/tooltip'
import Script from 'next/script'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consulty',
}


const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `(() => {
          try {
            const s = localStorage.getItem('crm-theme');
            const dark = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', dark);
          } catch {}
        })();` }} />
      </head>
      <body className={`${dmSans.variable} min-h-screen antialiased`}>
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