import Link from 'next/link';
import { Search, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/30 overflow-hidden font-sans relative">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="absolute w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full animate-pulse duration-1000" />
        <div className="absolute font-black text-[25vw] text-zinc-200/50 dark:text-zinc-800/50 select-none -z-20">
          404
        </div>
      </div>

      <div className="max-w-md w-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-8 sm:p-12 rounded-[3rem] shadow-2xl text-center relative z-10 group">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          <Search className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
          Page Not Found
        </h1>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 font-medium leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/25"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
