'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import { IconArrowLeft, IconCamera, IconDeviceFloppy, IconCheck, IconLogout, IconAlertCircle } from '@tabler/icons-react';
import {useToast} from '@/components/ui/Toast';
import { Box, Flex, Text, Button, Avatar, ActionIcon, FileButton, Paper, TextInput, Alert, Center, Group, Skeleton, Container } from '@mantine/core';

const DEFAULT_AVATAR = 'https://oqhjxepxjzkfunemjvqp.supabase.co/storage/v1/object/public/avatars/user-default.png';

interface UserProfile {
	id: string;
	email?: string;
}

export default function ProfilePage() {
	const {showToast} = useToast();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [user, setUser] = useState<UserProfile | null>(null);
	const [username, setUsername] = useState('');
	const [avatarUrl, setAvatarUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [uploading, setUploading] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);

	useEffect(() => {
		const fetchProfile = async () => {
			const {
				data: {session},
			} = await supabase.auth.getSession();
			if (!session) {
				router.push('/auth');
				return;
			}
			setUser(session.user);

			const {data} = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

			if (data) {
				setUsername(data.username || '');
				setAvatarUrl(data.avatar_url || '');
			}
			setLoading(false);
		};

		fetchProfile();
	}, [router]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim()) return;

		if (!user) return;

		setIsSaving(true);
		setProfileError(null);

		const usernameRegex = /^[a-z0-9-_]+$/;
		if (!usernameRegex.test(username)) {
			setProfileError('Username can only contain lowercase letters, numbers, hyphens, and underscores.');
			setIsSaving(false);
			return;
		}

		try {
			const {error} = await supabase.from('profiles').update({username, avatar_url: avatarUrl}).eq('id', user.id);

			if (error) throw error;

			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
			showToast({
				type: 'success',
				title: 'Profile Updated',
				message: 'Your changes have been saved.',
			});
		} catch (err: unknown) {
			const error = err as {message?: string; code?: string; status?: number};
			let message = error?.message || 'Could not save profile.';

			if (
				error?.code === '23505' ||
				error?.status === 409 ||
				message.toLowerCase().includes('already exists') ||
				message.includes('Database error saving new user')
			) {
				message = 'This username is already taken. Please try another one.';
			}

			setProfileError(message);
		} finally {
			setIsSaving(false);
		}
	};

	const uploadAvatar = async (file: File | null) => {
		if (!file) return;

		const localUrl = URL.createObjectURL(file);
		setPreviewUrl(localUrl);

		try {
			setUploading(true);
			if (!user) return;
			const fileExt = file.name.split('.').pop();
			const fileName = `${user.id}/${Math.random()}.${fileExt}`;

			const {error: uploadError} = await supabase.storage.from('avatars').upload(fileName, file);

			if (uploadError) throw uploadError;

			const {data} = supabase.storage.from('avatars').getPublicUrl(fileName);
			setAvatarUrl(data.publicUrl);
			setPreviewUrl('');

			showToast({
				type: 'info',
				title: 'Avatar Ready',
				message: "Click 'Save Changes' to apply your new avatar.",
			});
		} catch (error) {
			setPreviewUrl('');
			showToast({
				type: 'error',
				title: 'Upload Failed',
				message: error instanceof Error ? error.message : 'Could not upload avatar.',
			});
		} finally {
			setUploading(false);
		}
	};

	if (loading) {
		return (
			<Flex direction="column" mih="100vh" bg="var(--mantine-color-body)">
				<Center style={{ flexGrow: 1 }} p="xl">
					<Box w="100%" maw={500}>
						<Skeleton height={24} width="30%" mb="xs" />
						<Skeleton height={16} width="60%" mb="xl" />
						<Skeleton height={120} mb="md" radius="md" />
						<Skeleton height={300} radius="md" />
					</Box>
				</Center>
			</Flex>
		);
	}

	const displayAvatar = previewUrl || avatarUrl || DEFAULT_AVATAR;

	return (
		<Flex direction="column" mih="100vh" bg="var(--mantine-color-body)">
			<Box 
				component="nav" 
				px={{ base: 'md', lg: 'xl' }} 
				py="sm" 
				bg="var(--mantine-color-body)" 
				style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
			>
				<Group>
					<Button
						variant="subtle"
						color="gray"
						onClick={() => router.push('/')}
						leftSection={<IconArrowLeft size={16} />}
						size="sm"
					>
						Back to Board
					</Button>
					<Text c="dimmed">/</Text>
					<Text size="sm" fw={600}>Profile Settings</Text>
				</Group>
			</Box>

			<Container size="sm" py="xl" style={{ flexGrow: 1, width: '100%' }}>
				<Paper withBorder radius="md" p="md" mb="md" display="flex" style={{ alignItems: 'center', gap: '20px' }}>
					<Box pos="relative">
						<Avatar src={displayAvatar} size={64} radius="xl" color="blue" />
						<FileButton onChange={uploadAvatar} accept="image/png,image/jpeg,image/gif,image/webp">
							{(props) => (
								<ActionIcon 
									{...props} 
									radius="xl" 
									variant="default" 
									size="sm"
									pos="absolute" 
									bottom={-4} 
									right={-4} 
									loading={uploading}
									style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
								>
									<IconCamera size={14} />
								</ActionIcon>
							)}
						</FileButton>
					</Box>
					<Box style={{ flex: 1, minWidth: 0 }}>
						<Text fw={700} truncate>{username || '—'}</Text>
						<Text size="xs" c="dimmed" truncate>{user?.email}</Text>
						<Text size={'xs'} c="dimmed" mt={4} fw={500}>Click the camera to change your avatar</Text>
					</Box>
				</Paper>

				<Paper withBorder radius="md" component="form" onSubmit={handleSave} mb="md">
					<Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
						<Text size="xs" fw={700} c="dimmed" tt="uppercase">Account Details</Text>
					</Box>

					{profileError && (
						<Alert variant="light" color="red" title="Error" icon={<IconAlertCircle size={16} />} radius={0} style={{ borderBottom: '1px solid var(--mantine-color-red-light)' }}>
							{profileError}
						</Alert>
					)}

					<Box px="md" py="md">
						<Group mb="md" align="flex-start" wrap="nowrap">
							<Text size="sm" fw={500} c="dimmed" w={80} style={{ flexShrink: 0 }} mt={8}>Username</Text>
							<TextInput
								value={username}
								onChange={(e) => {
									setUsername(e.currentTarget.value);
									setProfileError(null);
								}}
								placeholder="johndoe"
								style={{ flexGrow: 1 }}
								radius="sm"
							/>
						</Group>

						<Group wrap="nowrap">
							<Text size="sm" fw={500} c="dimmed" w={80} style={{ flexShrink: 0 }}>Email</Text>
							<Text size="sm" c="dimmed" truncate style={{ flexGrow: 1 }}>{user?.email}</Text>
						</Group>
					</Box>

					<Box px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
						<Group justify="flex-end">
							<Button
								type="submit"
								color="dark"
								radius="sm"
								disabled={isSaving || !username.trim()}
								loading={isSaving}
								leftSection={saved ? <IconCheck size={16} /> : <IconDeviceFloppy size={16} />}
							>
								{saved ? 'Saved!' : 'Save Changes'}
							</Button>
						</Group>
					</Box>
				</Paper>

				<Paper withBorder radius="md">
					<Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
						<Text size="xs" fw={700} c="dimmed" tt="uppercase">Session</Text>
					</Box>
					<Group justify="space-between" px="md" py="md">
						<Box>
							<Text size="sm" fw={600}>Sign out</Text>
							<Text size="xs" c="dimmed">You'll be redirected to the login page.</Text>
						</Box>
						<Button
							variant="outline"
							color="red"
							radius="sm"
							onClick={() => {
								supabase.auth.signOut();
								router.push('/auth');
							}}
							leftSection={<IconLogout size={16} />}
						>
							Sign Out
						</Button>
					</Group>
				</Paper>
			</Container>
		</Flex>
	);
}
