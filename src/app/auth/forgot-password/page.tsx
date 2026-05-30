'use client';

import {useState} from 'react';
import {supabase} from '@/lib/supabase';
import { IconArrowLeft, IconAlertCircle, IconMail } from '@tabler/icons-react';
import {useToast} from '@/components/ui/Toast';
import Link from 'next/link';
import { Title, Text, TextInput, Button, Alert, Stack, Box, Center, Flex, Anchor } from '@mantine/core';

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
		<Flex mih="100vh" bg="var(--mantine-color-body)">
			<Center flex={1} p="xl" pos="relative">
				<Box w="100%" maw={400}>
					<Anchor component={Link} href="/auth" c="dimmed" size="sm" mb="xl" display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
						<IconArrowLeft size={16} />
						Back to login
					</Anchor>
					
					<Box mb="xl">
						<Title order={2} fw={700} lts={-0.5} mb="xs">Reset Password</Title>
						<Text size="sm" c="dimmed">
							Enter your email address and we'll send you a link to reset your password.
						</Text>
					</Box>

					{isSubmitted ? (
						<Alert variant="light" color="green" title="Check your email" icon={<IconMail size={16} />} radius="sm">
							We've sent a password reset link to <strong>{email}</strong>. You can close this window and continue from the link in your email.
						</Alert>
					) : (
						<form onSubmit={handleReset}>
							<Stack gap="md">
								{formError && (
									<Alert variant="light" color="red" title="Error" icon={<IconAlertCircle size={16} />} radius="sm">
										{formError}
									</Alert>
								)}

								<TextInput
									label="Email"
									placeholder="you@example.com"
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									radius="sm"
									size="md"
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
									Send Reset Link
								</Button>
							</Stack>
						</form>
					)}
				</Box>
			</Center>
			<Box style={{ flex: 1 }} bg="var(--mantine-color-gray-1)" display={{ base: 'none', lg: 'block' }}></Box>
		</Flex>
	);
}
