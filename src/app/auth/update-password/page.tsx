'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useRouter} from 'next/navigation';
import {useToast} from '@/components/ui/Toast';
import { Title, Text, PasswordInput, Button, Alert, Stack, Box, Center, Flex } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

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
		<Flex mih="100vh" bg="var(--mantine-color-body)">
			<Center flex={1} p="xl" pos="relative">
				<Box w="100%" maw={400}>
					<Box mb="xl">
						<Title order={2} fw={700} lts={-0.5} mb="xs">Update Password</Title>
						<Text size="sm" c="dimmed">
							Enter and confirm your new password below.
						</Text>
					</Box>

					<form onSubmit={handleUpdate}>
						<Stack gap="md">
							{formError && (
								<Alert variant="light" color="red" title="Error" icon={<IconAlertCircle size={16} />} radius="sm">
									{formError}
								</Alert>
							)}

							<PasswordInput
								label="New Password"
								placeholder="••••••••"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								radius="sm"
								size="md"
								minLength={6}
							/>

							<PasswordInput
								label="Confirm New Password"
								placeholder="••••••••"
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								radius="sm"
								size="md"
								minLength={6}
							/>

							<Button 
								type="submit" 
								loading={loading} 
								fullWidth 
								color="dark" 
								size="md" 
								radius="sm"
								mt="xs"
							>
								Update Password
							</Button>
						</Stack>
					</form>
				</Box>
			</Center>
			<Box style={{ flex: 1 }} bg="var(--mantine-color-gray-1)" display={{ base: 'none', lg: 'block' }}></Box>
		</Flex>
	);
}
