'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Decorative Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <div className="relative max-w-xl w-full text-center space-y-8 z-10">
        {/* Subtle glowing badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          Error 404
        </div>

        {/* Heading Statement */}
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
            Page not found
          </h1>
          <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
            The page you are looking for doesn't exist or has been moved permanently.
          </p>
        </div>

        {/* Dynamic Context Box */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-left max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1.5">
            <span>Requested Path</span>
            <span className="text-rose-400/80 font-medium">unresolved</span>
          </div>
          <div className="font-mono text-sm text-slate-300 break-all select-all bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800/50">
            {pathname}
          </div>
        </div>

        {/* Interactive / Dynamic Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium transition-all active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Go Back
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}