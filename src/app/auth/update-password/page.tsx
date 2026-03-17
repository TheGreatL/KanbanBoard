'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useRouter} from 'next/navigation';
import {Loader2} from 'lucide-react';
import {useToast} from '@/components/ui/Toast';

export default function UpdatePasswordPage() {
	const {showToast} = useToast();
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			setFormError('Passwords do not match');
			return;
		}

		if (password.length < 6) {
			setFormError('Password must be at least 6 characters');
			return;
		}

		setLoading(true);
		setFormError(null);

		try {
			const {error} = await supabase.auth.updateUser({
				password: password,
			});

			if (error) throw error;

			showToast({
				type: 'success',
				title: 'Password Updated',
				message: 'Your password has been successfully reset.',
			});

			router.push('/');
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
						<h2 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Update Password</h2>
						<p className='text-sm text-zinc-500 dark:text-zinc-400 mt-2'>Enter and confirm your new password below.</p>
					</div>

					<form
						onSubmit={handleUpdate}
						className='space-y-4'>
						{formError && (
							<div className='p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 animate-in fade-in slide-in-from-top-1 duration-200'>
								<p className='text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2'>
									<span className='w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0' />
									{formError}
								</p>
							</div>
						)}

						<div>
							<label
								htmlFor='password'
								className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
								New Password
							</label>
							<input
								id='password'
								type='password'
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className='w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
								placeholder='••••••••'
								minLength={6}
							/>
						</div>

						<div>
							<label
								htmlFor='confirmPassword'
								className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
								Confirm New Password
							</label>
							<input
								id='confirmPassword'
								type='password'
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className='w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
								placeholder='••••••••'
								minLength={6}
							/>
						</div>

						<button
							type='submit'
							disabled={loading}
							className='w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center'>
							{loading ?
								<Loader2 className='w-5 h-5 animate-spin' />
							:	'Update Password'}
						</button>
					</form>
				</div>
			</div>
			{/* gradient black and white mix background */}
			<div className='bg-amber-200/50 lg:block hidden'></div>
		</div>
	);
}
