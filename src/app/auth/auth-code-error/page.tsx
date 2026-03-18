'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  return (
    <div className='grow w-full max-w-md space-y-6 p-8'>
      <div className='text-center space-y-2'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-4'>
          <AlertCircle className='w-8 h-8' />
        </div>
        <h2 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Authentication Error</h2>
        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
          Something went wrong during the authentication process.
        </p>
      </div>

      <div className='p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 space-y-2'>
        <p className='text-sm font-semibold text-red-800 dark:text-red-400'>
          {error?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN ERROR'}
        </p>
        <p className='text-xs text-red-700 dark:text-red-500'>
          {errorDescription || 'An unexpected error occurred. Please try again or contact support.'}
        </p>
      </div>

      <div className='space-y-3'>
        <Link
          href='/auth'
          className='flex items-center justify-center w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors'
        >
          Back to Login
        </Link>
        <Link
          href='/auth/forgot-password'
          className='flex items-center justify-center w-full py-2.5 px-4 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium rounded-xl transition-colors border border-zinc-200 dark:border-zinc-800'
        >
          Request new reset link
        </Link>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-zinc-950'>
      <div className='flex items-center relative justify-center'>
        <Suspense fallback={<div className="animate-pulse bg-zinc-100 dark:bg-zinc-900 w-full max-w-md h-64 rounded-2xl" />}>
          <ErrorContent />
        </Suspense>
      </div>
      <div className='bg-amber-200/50 lg:block hidden'></div>
    </div>
  );
}
