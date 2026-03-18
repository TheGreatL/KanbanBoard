'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import {Loader2, ArrowLeft} from 'lucide-react';
import {useToast} from '@/components/ui/Toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
	const {showToast} = useToast();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleReset = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setFormError(null);

		try {
			const {error} = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/verify-reset`,
			});
			if (error) throw error;
			setIsSubmitted(true);
			showToast({
				type: 'success',
				title: 'Reset Email Sent',
				message: 'Check your email for the password reset link.',
			});
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'An error occurred.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-zinc-950'>
			<div className='flex items-center relative justify-center'>
				<div className='grow w-full max-w-md space-y-4 p-8'>
					<div className='mb-8'>
						<Link href='/auth' className='inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-6 transition-colors'>
							<ArrowLeft className='w-4 h-4 mr-2' />
							Back to login
						</Link>
						<h2 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Reset Password</h2>
						<p className='text-sm text-zinc-500 dark:text-zinc-400 mt-2'>
							Enter your email address and we&apos;ll send you a link to reset your password.
						</p>
					</div>

					{isSubmitted ? (
						<div className='p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 text-center space-y-4'>
							<h3 className='font-semibold text-green-800 dark:text-green-400'>Check your email</h3>
							<p className='text-sm text-green-700 dark:text-green-500'>
								We&apos;ve sent a password reset link to <strong>{email}</strong>.
							</p>
							<p className='text-xs text-green-600 dark:text-green-600 mt-2'>
								You can close this window and continue from the link in your email.
							</p>
						</div>
					) : (
						<form onSubmit={handleReset} className='space-y-4'>
							{formError && (
								<div className='p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 animate-in fade-in slide-in-from-top-1 duration-200'>
									<p className='text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2'>
										<span className='w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0' />
										{formError}
									</p>
								</div>
							)}

							<div>
								<label htmlFor='email' className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
									Email
								</label>
								<input
									id='email'
									type='email'
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className='w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
									placeholder='you@example.com'
								/>
							</div>

							<button
								type='submit'
								disabled={loading}
								className='w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center'>
								{loading ? <Loader2 className='w-5 h-5 animate-spin' /> : 'Send Reset Link'}
							</button>
						</form>
					)}
				</div>
			</div>
			{/* gradient black and white mix background */}
			<div className='bg-amber-200/50 lg:block hidden'></div>
		</div>
	);
}
