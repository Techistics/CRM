import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import { AuthToastWrapper } from '@/components/auth-toast-wrapper'
import { FetchInterceptor } from '@/components/FetchInterceptor'

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = localStorage.getItem('crm-theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.toggle('dark', theme === 'dark');
            } catch {}
          })();`}
        </Script>
        <Script id="fetch-interceptor-init" strategy="beforeInteractive">
          {`(() => {
            try {
              if (typeof window === 'undefined' || window.__crmFetchPatched) return;
              const originalFetch = window.fetch.bind(window);
              window.fetch = async (...args) => {
                const res = await originalFetch(...args);
                if (!res.ok) {
                  const body = await res.clone().json().catch(() => ({}));
                  const msg = body?.message ?? body?.error ?? \`Request failed: \${res.status}\`;
                  throw new Error(msg);
                }
                return res;
              };
              window.__crmFetchPatched = true;
            } catch {}
          })();`}
        </Script>
        <AuthToastWrapper />
        <FetchInterceptor />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}