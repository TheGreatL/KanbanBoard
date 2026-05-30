'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IconLoader2, IconAlertCircle } from '@tabler/icons-react';

export default function ShareLinkRedemption() {
	const params = useParams();
	const router = useRouter();
	const token = params.token as string;
	
	const [status, setStatus] = useState('Verifying your session...');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		const redeemToken = async () => {
			if (!token) {
				if (isMounted) setError('Invalid share link.');
				return;
			}

			try {
				// 1. Ensure user is authenticated (using anonymous auth if not logged in)
				const { data: { session } } = await supabase.auth.getSession();
				let user = session?.user;

				if (!user) {
					if (isMounted) setStatus('Creating anonymous session...');
					const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
					
					if (anonError) {
						console.error('Anonymous auth error:', anonError);
						throw new Error('Anonymous sign-in failed. Please ensure "Anonymous Sign-ins" are enabled in your Supabase Auth dashboard.');
					}
					user = anonData.user;
				}

				if (!user) throw new Error('Failed to authenticate.');

				if (isMounted) setStatus('Verifying share link and granting access...');

				// 2. Call the secure RPC function to redeem the token
				// This bypasses RLS on project_members since it runs as SECURITY DEFINER
				const { data: result, error: rpcError } = await supabase.rpc('redeem_share_link', {
					share_token: token
				});

				if (rpcError) {
					console.error('RPC Error:', rpcError);
					throw new Error(rpcError.message || 'Failed to redeem share link.');
				}

				// 3. Redirect to home
				if (isMounted) setStatus('Redirecting to your board...');
				
				// Small delay for better UX
				setTimeout(() => {
					if (isMounted) router.push('/');
				}, 1000);

			} catch (err: any) {
				if (isMounted) setError(err.message || 'An unexpected error occurred.');
			}
		};

		redeemToken();

		return () => {
			isMounted = false;
		};
	}, [token, router]);

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
			<div className="flex flex-col items-center gap-4 text-center max-w-md p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
				{error ? (
					<>
						<IconAlertCircle className="w-12 h-12 text-red-500" />
						<h2 className="text-lg font-semibold">Access Failed</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
						<button 
							onClick={() => router.push('/')}
							className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
						>
							Go to Dashboard
						</button>
					</>
				) : (
					<>
						<IconLoader2 className="w-10 h-10 animate-spin text-blue-500" />
						<h2 className="text-lg font-semibold">Processing Share Link</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p>
					</>
				)}
			</div>
		</div>
	);
}
