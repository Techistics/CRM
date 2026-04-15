import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  )
}