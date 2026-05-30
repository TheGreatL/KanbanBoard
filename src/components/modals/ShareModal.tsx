'use client';

import {useState, useEffect} from 'react';
import {supabase} from '@/lib/supabase';
import {IconShare, IconSearch, IconUserPlus, IconUserMinus, IconChevronDown, IconCheck, IconLink, IconCopy, IconTrash} from '@tabler/icons-react';
import {Modal, TextInput, Group, Stack, Text, Menu, Avatar, ActionIcon, Loader, Badge, ScrollArea, Box, Button, UnstyledButton, Divider, CopyButton, Tooltip} from '@mantine/core';

interface ShareModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
	currentUserId: string | null;
}

const ROLES = [
	{value: 'viewer', label: 'Viewer', description: 'Read-only access'},
	{value: 'editor', label: 'Editor', description: 'Can edit tasks'},
];

function RoleDropdown({value, onChange, disabled}: {value: string; onChange: (v: string) => void; disabled?: boolean}) {
	const selected = ROLES.find((r) => r.value === value) ?? ROLES[0];

	return (
		<Menu shadow="md" width={200} position="bottom-end" disabled={disabled}>
			<Menu.Target>
				<UnstyledButton className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors uppercase h-7 disabled:opacity-50">
					<span className="text-zinc-600 dark:text-zinc-400">{selected.label}</span>
					{!disabled && <IconChevronDown size={12} className="text-zinc-400" />}
				</UnstyledButton>
			</Menu.Target>

			<Menu.Dropdown>
				{ROLES.map((role) => (
					<Menu.Item 
						key={role.value} 
						onClick={() => onChange(role.value)}
						rightSection={value === role.value ? <IconCheck size={14} className="text-blue-500" /> : null}
					>
						<Text size="sm" fw={600}>{role.label}</Text>
						<Text size="xs" c="dimmed">{role.description}</Text>
					</Menu.Item>
				))}
			</Menu.Dropdown>
		</Menu>
	);
}

export default function ShareModal({isOpen, onClose, projectId, currentUserId}: ShareModalProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [projectMembers, setProjectMembers] = useState<any[]>([]);
	const [invitingRole, setInvitingRole] = useState('viewer');
	const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

	const [shareLinks, setShareLinks] = useState<any[]>([]);
	const [generatingLink, setGeneratingLink] = useState(false);
	const [shareLinkRole, setShareLinkRole] = useState('viewer');

	const currentUserRole = projectMembers.find((m) => m.user_id === currentUserId)?.role;
	const isOwner = currentUserRole === 'owner';

	const memberUserIds = new Set(projectMembers.map((m) => m.user_id));

	const fetchProjectMembers = async () => {
		const {data} = await supabase.from('project_members').select('*, profile:profiles(username, avatar_url)').eq('project_id', projectId);
		if (data) setProjectMembers(data);
	};

	const fetchShareLinks = async () => {
		const {data} = await supabase.from('project_share_links').select('*').eq('project_id', projectId);
		if (data) setShareLinks(data);
	};

	useEffect(() => {
		if (isOpen) {
			fetchProjectMembers();
			if (isOwner) fetchShareLinks();
		}
	}, [isOpen, projectId, isOwner]);

	const searchUsers = async (query: string) => {
		if (!query.trim()) {
			setSearchResults([]);
			return;
		}
		setIsSearching(true);
		const {data} = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${query}%`).limit(10);

		const filtered = (data || []).filter((u: any) => !memberUserIds.has(u.id));
		setSearchResults(filtered.slice(0, 5));
		setIsSearching(false);
	};

	const addProjectMember = async (userId: string) => {
		const {error} = await supabase.from('project_members').insert({project_id: projectId, user_id: userId, role: invitingRole});

		if (!error) {
			await fetchProjectMembers();
			setSearchQuery('');
			setSearchResults([]);
		}
	};

	const removeProjectMember = async (memberId: string) => {
		const {error} = await supabase.from('project_members').delete().eq('id', memberId);

		if (!error) {
			await fetchProjectMembers();
		}
	};

	const updateProjectMemberRole = async (memberId: string, newRole: string) => {
		setUpdatingMemberId(memberId);
		const {error} = await supabase.from('project_members').update({role: newRole}).eq('id', memberId);

		if (!error) {
			await fetchProjectMembers();
		}
		setUpdatingMemberId(null);
	};

	const generateShareLink = async () => {
		setGeneratingLink(true);
		const {error} = await supabase.from('project_share_links').insert({
			project_id: projectId,
			role: shareLinkRole,
			created_by: currentUserId
		});
		
		if (!error) {
			await fetchShareLinks();
		}
		setGeneratingLink(false);
	};

	const revokeShareLink = async (linkId: string) => {
		const {error} = await supabase.from('project_share_links').delete().eq('id', linkId);
		if (!error) {
			await fetchShareLinks();
		}
	};

	if (!isOpen && typeof window !== 'undefined') return null;

	return (
		<Modal 
			opened={isOpen} 
			onClose={onClose} 
			title={
				<Group gap="xs">
					<IconShare size={18} className="text-zinc-500" />
					<Text fw={600}>Share Project</Text>
				</Group>
			}
			centered
		>
			<Stack gap="lg">
				<Stack gap="xs">
					<TextInput
						placeholder="Invite by username..."
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.currentTarget.value);
							searchUsers(e.currentTarget.value);
						}}
						leftSection={<IconSearch size={16} />}
						data-autofocus
					/>

					{isOwner && (
						<Group gap="xs" px={4} align="center">
							<Text size="xs" fw={600} c="dimmed" tt="uppercase">Role:</Text>
							<RoleDropdown value={invitingRole} onChange={setInvitingRole} />
						</Group>
					)}

					{isSearching ? (
						<Group justify="center" p="md">
							<Loader size="sm" color="gray" />
						</Group>
					) : searchResults.length > 0 ? (
						<Box className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
							{searchResults.map((user) => (
								<Group key={user.id} justify="space-between" p="sm">
									<Group gap="sm">
										<Avatar src={user.avatar_url} size="sm" radius="xl">{!user.avatar_url && user.username.charAt(0).toUpperCase()}</Avatar>
										<Text size="sm" fw={500}>{user.username}</Text>
									</Group>
									<Button size="xs" variant="default" leftSection={<IconUserPlus size={14} />} onClick={() => addProjectMember(user.id)}>
										Invite
									</Button>
								</Group>
							))}
						</Box>
					) : searchQuery.trim() && !isSearching ? (
						<Text size="xs" c="dimmed" ta="center" py="sm">No users found.</Text>
					) : null}
				</Stack>

				<Stack gap="xs">
					<Text size="xs" fw={600} c="dimmed" tt="uppercase" px={4}>Current Members</Text>
					<ScrollArea h={300} type="always" offsetScrollbars>
						<Stack gap="xs">
							{projectMembers.map((member) => (
								<Group key={member.id} justify="space-between" p="xs" className="hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-colors">
									<Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
										<Avatar src={member.profile?.avatar_url} size="sm" radius="xl">{!member.profile?.avatar_url && member.profile?.username?.charAt(0).toUpperCase()}</Avatar>
										<Box style={{ flex: 1, minWidth: 0 }}>
											<Text size="sm" fw={600} truncate>{member.profile?.username}</Text>
											<Group gap={4}>
												<Text fz={10} fw={500} c="dimmed">{member.user_id === currentUserId ? 'You' : 'Member'}</Text>
												{member.joined_via_link_id && (
													<Tooltip label="Joined via Share Link" withArrow position="top">
														<IconLink size={10} className="text-blue-500" />
													</Tooltip>
												)}
											</Group>
										</Box>
									</Group>

									<Group gap="xs" wrap="nowrap">
										{member.user_id !== currentUserId && member.role !== 'owner' && isOwner ? (
											<RoleDropdown
												value={member.role}
												onChange={(newRole) => updateProjectMemberRole(member.id, newRole)}
												disabled={updatingMemberId === member.id}
											/>
										) : (
											<Badge variant="light" color="gray" size="sm" radius="sm">{member.role}</Badge>
										)}

										{member.user_id !== currentUserId && member.role !== 'owner' && isOwner && (
											<ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeProjectMember(member.id)}>
												<IconUserMinus size={16} />
											</ActionIcon>
										)}
									</Group>
								</Group>
							))}
							{projectMembers.length === 0 && <Text size="xs" c="dimmed" fs="italic" ta="center" p="sm">No other members yet.</Text>}
						</Stack>
					</ScrollArea>
				</Stack>

				{isOwner && (
					<>
						<Divider my="sm" />
						<Stack gap="xs">
							<Group justify="space-between" px={4}>
								<Text size="xs" fw={600} c="dimmed" tt="uppercase">Shareable Links</Text>
								<Group gap="xs">
									<RoleDropdown value={shareLinkRole} onChange={setShareLinkRole} />
									<Button 
										size="compact-xs" 
										variant="light" 
										leftSection={<IconLink size={14} />} 
										onClick={generateShareLink} 
										loading={generatingLink}
									>
										Generate
									</Button>
								</Group>
							</Group>
							
							{shareLinks.length > 0 ? (
								<Stack gap="xs">
									{shareLinks.map((link) => {
										const url = `${window.location.origin}/share/${link.id}`;
										return (
											<Group key={link.id} justify="space-between" p="xs" className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
												<Group gap="xs">
													<Badge size="sm" variant="dot" color={link.role === 'editor' ? 'blue' : 'gray'}>{link.role}</Badge>
													<Text size="xs" c="dimmed" truncate w={150}>{url}</Text>
												</Group>
												<Group gap="xs">
													<CopyButton value={url} timeout={2000}>
														{({ copied, copy }) => (
															<Tooltip label={copied ? 'Copied' : 'Copy link'} withArrow position="top">
																<ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy} size="sm">
																	{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
																</ActionIcon>
															</Tooltip>
														)}
													</CopyButton>
													<Tooltip label="Revoke link" withArrow position="top">
														<ActionIcon color="red" variant="subtle" onClick={() => revokeShareLink(link.id)} size="sm">
															<IconTrash size={14} />
														</ActionIcon>
													</Tooltip>
												</Group>
											</Group>
										);
									})}
								</Stack>
							) : (
								<Text size="xs" c="dimmed" fs="italic" ta="center" p="sm">No active share links.</Text>
							)}
						</Stack>
					</>
				)}
			</Stack>
		</Modal>
	);
}
