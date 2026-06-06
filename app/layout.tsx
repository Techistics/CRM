import './globals.css'
// Removed Google Font import to avoid build-time network fetch issues
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthToastWrapper } from '@/components/auth-toast-wrapper'
import { FetchInterceptor } from '@/components/FetchInterceptor'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = { variable: '', className: '' } // fallback when Inter font cannot be loaded

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: `(() => {
            try {
              const stored = localStorage.getItem('crm-theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.toggle('dark', theme === 'dark');
            } catch {}
          })();` }} />
        <script id="fetch-interceptor-init" dangerouslySetInnerHTML={{ __html: `(() => {
            try {
              if (typeof window === 'undefined' || window.__crmFetchPatched) return;
              const originalFetch = window.fetch.bind(window);
              window.fetch = async (...args) => {
                const res = await originalFetch(...args);
                if (res.status >= 400) {
                  const body = await res.clone().json().catch(() => ({}));
                  const msg = body?.message ?? body?.error ?? \`Request failed: \${res.status}\`;
                  throw new Error(msg);
                }
                return res;
              };
              window.__crmFetchPatched = true;
            } catch {}
          })();` }} />
      </head>
      <body className={`${inter.className} min-h-screen antialiased`}>
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
