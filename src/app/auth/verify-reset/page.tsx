'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, Loader2 } from 'lucide-react';

function VerifyResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const code = searchParams.get('code');
  
  const handleConfirm = () => {
    setLoading(true);
    // Redirect to the callback route with the code
    // This ensures a user interaction (click) happens before the one-time code is consumed
    router.push(`/auth/callback?code=${code}&next=/auth/update-password`);
  };

  if (!code) {
    return (
      <div className='grow w-full max-w-md space-y-6 p-8'>
        <div className='text-center space-y-2'>
          <h2 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Invalid Link</h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>
            This password reset link appears to be invalid or incomplete.
          </p>
        </div>
        <button
          onClick={() => router.push('/auth/forgot-password')}
          className='w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors'
        >
          Request new link
        </button>
      </div>
    );
  }

  return (
    <div className='grow w-full max-w-md space-y-6 p-8'>
      <div className='text-center space-y-2'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mb-4'>
          <KeyRound className='w-8 h-8' />
        </div>
        <h2 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Reset Password</h2>
        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
          Click the button below to verify your request and reset your password.
        </p>
      </div>

      <div className='p-4 rounded-xl bg-blue-50 dark:bg-blue-900/5 border border-blue-100 dark:border-blue-900/10'>
        <p className='text-xs text-blue-700 dark:text-blue-400 text-center'>
          To protect your account, we require this extra step to ensure the reset link wasn&apos;t automatically consumed by an email scanner.
        </p>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className='w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70'
      >
        {loading ? (
          <Loader2 className='w-5 h-5 animate-spin' />
        ) : (
          <>
            Confirm Reset
            <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
          </>
        )}
      </button>
    </div>
  );
}

export default function VerifyResetPage() {
  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-zinc-950'>
      <div className='flex items-center relative justify-center'>
        <Suspense fallback={<div className="animate-pulse bg-zinc-100 dark:bg-zinc-900 w-full max-w-md h-64 rounded-2xl" />}>
          <VerifyResetContent />
        </Suspense>
      </div>
      <div className='bg-amber-200/50 lg:block hidden'></div>
    </div>
  );
}
