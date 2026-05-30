'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import { IconBrandGithub, IconAlertCircle } from '@tabler/icons-react';
import {useToast} from './ui/Toast';
import { 
  TextInput, PasswordInput, Button, SegmentedControl, 
  Divider, Alert, ActionIcon, Title, Text, Stack, Box, Center, Tooltip, Group
} from '@mantine/core';

export default function AuthForm() {
	const {showToast} = useToast();
	const [mode, setMode] = useState('login');
	const isLogin = mode === 'login';
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const router = useRouter();

	const handleToggleMode = (newMode: string) => {
		setMode(newMode);
		setFormError(null);
		setConfirmPassword('');
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
		<Box style={{ flexGrow: 1, maxWidth: 450, width: '100%' }} mx="auto">
			<Box mb="xl" ta="center">
				<Title order={2} fw={700} mb="xs" style={{ letterSpacing: '-0.02em' }}>
					{isLogin ? 'Welcome back' : 'Create an account'}
				</Title>
				<Text size="sm" c="dimmed">
					{isLogin ? 'Enter your credentials to access your workspaces.' : 'Sign up to start organizing your projects.'}
				</Text>
			</Box>

			<SegmentedControl
				value={mode}
				onChange={handleToggleMode}
				data={[
					{ label: 'Sign In', value: 'login' },
					{ label: 'Sign Up', value: 'signup' }
				]}
				fullWidth
				size="md"
				radius="sm"
				mb="xl"
			/>

			<form onSubmit={handleAuth}>
				<Stack gap="md">
					{formError && (
						<Alert variant="light" color="red" title="Authentication Error" icon={<IconAlertCircle size={16} />} radius="sm">
							{formError}
						</Alert>
					)}

					{!isLogin && (
						<TextInput
							label="Username"
							placeholder="johndoe"
							required
							value={username}
							onChange={(e) => {
								setUsername(e.currentTarget.value);
								setFormError(null);
							}}
							radius="sm"
							size="md"
						/>
					)}

					<TextInput
						label="Email"
						placeholder="you@example.com"
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.currentTarget.value)}
						radius="sm"
						size="md"
					/>

					<Box>
						<Group justify="space-between" mb={4}>
							<Text size="sm" fw={500} component="label" htmlFor="password">Password <span style={{ color: 'var(--mantine-color-red-filled)' }}>*</span></Text>
							{isLogin && (
								<Text component={Link} href="/auth/forgot-password" size="xs" c="blue" className="hover:underline">
									Forgot Password?
								</Text>
							)}
						</Group>
						<PasswordInput
							id="password"
							placeholder="••••••••"
							required
							value={password}
							onChange={(e) => setPassword(e.currentTarget.value)}
							autoComplete={isLogin ? 'current-password' : 'new-password'}
							radius="sm"
							size="md"
						/>
					</Box>

					{!isLogin && (
						<PasswordInput
							label="Confirm Password"
							placeholder="••••••••"
							required
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.currentTarget.value)}
							autoComplete="new-password"
							radius="sm"
							size="md"
						/>
					)}

					<Button 
						type="submit" 
						loading={loading} 
						fullWidth 
						color="dark" 
						size="md" 
						radius="sm"
						mt="sm"
					>
						{isLogin ? 'Sign In' : 'Sign Up'}
					</Button>
				</Stack>
			</form>

			<Divider label={<Text size="xs" fw={600} c="dimmed" tt="uppercase">Or Continue With</Text>} labelPosition="center" my="xl" />

			<Center>
				<Tooltip label="Login via Github" position="bottom" withArrow>
					<ActionIcon 
						variant="default" 
						size={48}
						radius="xl" 
						onClick={handleGithubAuth} 
						loading={loading}
					>
						<IconBrandGithub size={24} />
					</ActionIcon>
				</Tooltip>
			</Center>
		</Box>
	);
}
