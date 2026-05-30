'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import { IconBrandGithub, IconLoader2, IconEye, IconEyeOff } from '@tabler/icons-react';
import {useToast} from './ui/Toast';
import {Tooltip} from './ui/Tooltip';
import {cn} from '@/lib/utils';

export default function AuthForm() {
	const {showToast} = useToast();
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const router = useRouter();

	// Clear error when switching tabs
	const handleToggleMode = (login: boolean) => {
		setIsLogin(login);
		setFormError(null);
		setConfirmPassword('');
		setShowPassword(false);
	};

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			setFormError(null);
			if (isLogin) {
				const {error} = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
				showToast({
					type: 'success',
					title: 'Login Success',
					message: 'Welcome back! You are now logged in.',
				});
				router.push('/');
			} else {
				if (password !== confirmPassword) {
					setFormError('Passwords do not match.');
					setLoading(false);
					return;
				}

				// Username validation: lowercase alphanumeric, hyphens, underscores
				const usernameRegex = /^[a-z0-9-_]+$/;
				if (!usernameRegex.test(username)) {
					setFormError('Username can only contain lowercase letters, numbers, hyphens, and underscores.');
					setLoading(false);
					return;
				}

				const {data, error} = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {username},
					},
				});
				if (error) throw error;

				// Detect fake success caused by Supabase Email Enumeration Protection
				// If the email already exists, Supabase returns a fake user with an empty identities array
				if (data.user && data.user.identities && data.user.identities.length === 0) {
					throw new Error('User already registered');
				}
				showToast({
					type: 'success',
					title: 'Account Created',
					message: 'Welcome! Please verify your email if required.',
				});
				router.push('/');
			}
		} catch (err) {
			let message = err instanceof Error ? err.message : 'An error occurred during authentication.';

			// Map specific Database error from trigger
			if (message.includes('Database error saving new user') || message.includes('User already registered')) {
				message = 'This email or username is already registered. If you previously signed up with GitHub, please use GitHub to log in.';
			}
			if (message.includes('email rate limit exceeded')) {
				message = 'This email is already registered. Try logging in instead.';
			}

			setFormError(message);
		} finally {
			setLoading(false);
		}
	};

	const handleGithubAuth = async () => {
		setLoading(true);
		try {
			const {error} = await supabase.auth.signInWithOAuth({
				provider: 'github',
				options: {
					redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
				},
			});
			if (error) throw error;
		} catch (err) {
			showToast({
				type: 'error',
				title: 'Login Failed',
				message: err instanceof Error ? err.message : 'An error occurred during authentication.',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='grow max-w-1/2 space-y-4'>
			<div className=''>
				<h2 className='text-3xl font-bold text-center text-zinc-900 dark:text-zinc-50'>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
				<p className='text-sm text-center text-zinc-500 dark:text-zinc-400 mt-2'>
					{isLogin ? 'Enter your credentials to access your workspaces.' : 'Sign up to start organizing your projects.'}
				</p>
			</div>
			<div className='relative flex p-1.5 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl'>
				<div
					className={cn(
						'absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-white dark:bg-zinc-800 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out',
						!isLogin && 'translate-x-full',
					)}
				/>
				<button
					type='button'
					onClick={() => handleToggleMode(true)}
					className={cn(
						'relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-300 z-10 outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
						isLogin ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
					)}>
					Sign In
				</button>
				<button
					type='button'
					onClick={() => handleToggleMode(false)}
					className={cn(
						'relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-300 z-10 outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
						!isLogin ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
					)}>
					Sign Up
				</button>
			</div>
			<form
				onSubmit={handleAuth}
				className=' grow space-y-4'>
				{formError && (
					<div className='p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 animate-in fade-in slide-in-from-top-1 duration-200'>
						<p className='text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2'>
							<span className='w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0' />
							{formError}
						</p>
					</div>
				)}
				{!isLogin && (
					<div>
						<label
							htmlFor='username'
							className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
							Username
						</label>
						<input
							id='username'
							type='text'
							required
							value={username}
							onChange={(e) => {
								setUsername(e.target.value);
								setFormError(null);
							}}
							className='w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
							placeholder='johndoe'
						/>
					</div>
				)}

				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
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

				<div>
					<div className="flex justify-between items-center mb-1">
						<label
							htmlFor='password'
							className='block text-sm font-medium text-zinc-700 dark:text-zinc-300'>
							Password
						</label>
						{isLogin && (
							<Link href="/auth/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
								Forgot Password?
							</Link>
						)}
					</div>
					<div className="relative">
						<input
							id='password'
							type={showPassword ? 'text' : 'password'}
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete={isLogin ? 'current-password' : 'new-password'}
							className='w-full px-3 py-2 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
							placeholder='••••••••'
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
							tabIndex={-1}
						>
							{showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
						</button>
					</div>
				</div>

				{!isLogin && (
					<div>
						<label
							htmlFor='confirmPassword'
							className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'>
							Confirm Password
						</label>
						<div className="relative">
							<input
								id='confirmPassword'
								type={showPassword ? 'text' : 'password'}
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								autoComplete='new-password'
								className='w-full px-3 py-2 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100'
								placeholder='••••••••'
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
								tabIndex={-1}
							>
								{showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
							</button>
						</div>
					</div>
				)}

				<button
					type='submit'
					disabled={loading}
					className='w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center'>
					{loading ?
						<IconLoader2 className='w-5 h-5 animate-spin' />
					: isLogin ?
						'Sign In'
					:	'Sign Up'}
				</button>
			</form>

			<div className='mt-10'>
				<div className=' h-1 flex gap-2 items-center justify-center my-4'>
					<div className='h-0.5 rounded-full grow  bg-zinc-200 dark:bg-zinc-800'></div>
					<span className='  text-zinc-500 dark:text-zinc-400 font-semibold text-xs'>Or Continue With</span>
					<div className='h-0.5 rounded-full grow bg-zinc-200 dark:bg-zinc-800'></div>
				</div>
				<div className='flex gap-5 items-center justify-center'>
					<Tooltip text='Login via Github'>
						<button
							onClick={handleGithubAuth}
							disabled={loading}
							type='button'
							title='Login via Github'
							className='  p-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-full transition-colors disabled:opacity-50 flex items-center justify-center'>
							<IconBrandGithub className='w-5 h-5' />
						</button>
					</Tooltip>{' '}
				</div>
			</div>
		</div>
	);
}
