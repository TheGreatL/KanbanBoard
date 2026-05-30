'use client';
import {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {
	DndContext,
	DragOverlay,
	closestCorners,
	PointerSensor,
	useSensor,
	useSensors,
	DragStartEvent,
	DragOverEvent,
	DragEndEvent,
	CollisionDetection,
	MeasuringStrategy,
} from '@dnd-kit/core';
import {SortableContext, arrayMove, horizontalListSortingStrategy} from '@dnd-kit/sortable';
import {createPortal} from 'react-dom';
import {TransformWrapper, TransformComponent, useControls, useTransformEffect} from 'react-zoom-pan-pinch';
import Column, {ColumnType} from './Column';
import TaskCard, {Task} from './TaskCard';
import {supabase} from '@/lib/supabase';
import {Tooltip, ActionIcon, Button, Avatar, Modal, Text, Group} from '@mantine/core';
import {useToast} from './ui/Toast';
import {IconPlus, IconZoomIn, IconMaximize, IconColumns, IconShare, IconUsers, IconLayoutDashboard, IconLock, IconZoomOut} from '@tabler/icons-react';
import ShareModal from './modals/ShareModal';
import AddTaskModal from './modals/AddTaskModal';
import AddColumnModal from './modals/AddColumnModal';
import {BoardSkeleton} from './ui/Skeleton';
import { throttle } from '@/lib/utils';
import Image from 'next/image';
import { generateKeyBetween } from 'fractional-indexing';
interface KanbanBoardProps {
	projectId: string;
	onToggleSidebar: () => void;
}

// Separate component so it can use useControls() inside TransformWrapper context
function ZoomControls() {
	const {zoomIn, zoomOut, resetTransform} = useControls();
	const [displayScale, setDisplayScale] = useState(100);

	useTransformEffect(({state}) => {
		setDisplayScale(Math.round(state.scale * 100));
	});

	return (
		<div className='absolute top-auto bottom-6 right-6 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm z-50 no-pan animate-in slide-in-from-bottom-4 duration-500'>
			<Tooltip label='Zoom Out' position="top" withArrow>
				<ActionIcon
					variant="subtle" color="gray" size="lg"
					onClick={() => zoomOut(0.2)}>
					<IconZoomOut size={18} />
				</ActionIcon>
			</Tooltip>
			<Tooltip label='Zoom In' position="top" withArrow>
				<ActionIcon
					variant="subtle" color="gray" size="lg"
					onClick={() => zoomIn(0.2)}>
					<IconZoomIn size={18} />
				</ActionIcon>
			</Tooltip>
			<div className='w-px h-6 bg-zinc-200/50 dark:bg-zinc-800/50 mx-1' />
			<Tooltip label='Reset Camera' position="top" withArrow>
				<ActionIcon
					variant="subtle" color="gray" size="lg"
					onClick={() => resetTransform()}>
					<IconMaximize size={18} />
				</ActionIcon>
			</Tooltip>
			<div className='hidden lg:flex items-center'>
				<div className='w-px h-6 bg-zinc-200/50 dark:bg-zinc-800/50 mx-1' />
				<div className='px-3 py-2 text-zinc-500 flex items-center justify-center min-w-[60px]'>
					<span className='text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-500'>{displayScale}%</span>
				</div>
			</div>
		</div>
	);
}

export default function KanbanBoard({projectId, onToggleSidebar}: KanbanBoardProps) {
	const {showToast} = useToast();
	const [projectName, setProjectName] = useState('');
	const [columns, setColumns] = useState<ColumnType[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [collaborators, setCollaborators] = useState<any[]>([]);
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isSharing, setIsSharing] = useState(false);
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [isAddingColumn, setIsAddingColumn] = useState(false);
	const [selectedColumnId, setSelectedColumnId] = useState('');

	const [pendingArchiveDrag, setPendingArchiveDrag] = useState<{
		activeId: string;
		targetColumnId: string;
		initialColumnId: string;
		newPos: string;
		activeTaskInState: Task;
	} | null>(null);

	const confirmArchiveDrag = async () => {
		if (!pendingArchiveDrag) return;
		const {activeId, targetColumnId, newPos, activeTaskInState, initialColumnId} = pendingArchiveDrag;
		setPendingArchiveDrag(null);
		const now = new Date().toISOString();

		updateTasks((prev) =>
			prev.map((t) =>
				t.id === activeId ? {...t, position: newPos, archived_at: now, previous_column_id: initialColumnId} : t
			)
		);

		try {
			const {error} = await supabase
				.from('tasks')
				.update({column_id: targetColumnId, position: newPos, archived_at: now, previous_column_id: initialColumnId})
				.eq('id', activeId);
			if (error) throw error;

			showToast({
				type: 'success',
				title: 'Task Archived',
				message: `"${activeTaskInState.title}" moved to Archive.`,
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			console.error('Task persistence error:', err);
			showToast({
				type: 'error',
				title: 'Sync Error',
				message: 'Could not save changes. Refreshing...',
			});
			fetchBoardData(); // Force sync with server
		}
	};

	const cancelArchiveDrag = () => {
		if (!pendingArchiveDrag) return;
		const {activeId, initialColumnId} = pendingArchiveDrag;
		updateTasks((prev) => prev.map((t) => (t.id === activeId ? {...t, column_id: initialColumnId} : t)));
		setPendingArchiveDrag(null);
	};

	const columnsRef = useRef<ColumnType[]>([]);
	const tasksRef = useRef<Task[]>([]);
	const initialColumnIdRef = useRef<string | null>(null);

	// Custom setters that also update the sync refs immediately
	const updateColumns = useCallback((updater: ColumnType[] | ((prev: ColumnType[]) => ColumnType[])) => {
		setColumns((prev) => {
			const next = typeof updater === 'function' ? updater(prev) : updater;
			columnsRef.current = next;
			return next;
		});
	}, []);

	const sortTasks = (tsks: Task[]) => {
		return [...tsks].sort((a, b) => {
			if (a.column_id !== b.column_id) return a.column_id.localeCompare(b.column_id);
			return a.position.localeCompare(b.position) || a.id.localeCompare(b.id);
		});
	};

	const updateTasks = useCallback((updater: Task[] | ((prev: Task[]) => Task[]), shouldSort = false) => {
		setTasks((prev) => {
			const next = typeof updater === 'function' ? updater(prev) : updater;
			const result = shouldSort ? sortTasks(next) : next;
			tasksRef.current = result;
			return result;
		});
	}, []);

	// Advanced Realtime State
	const [remoteDragging, setRemoteDragging] = useState<Record<string, {taskId: string; columnId: string; username: string}>>({});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const channelRef = useRef<any>(null);

	const AVAILABLE_COLORS = ['zinc', 'blue', 'rose', 'emerald', 'amber', 'indigo', 'violet', 'cyan', 'teal', 'fuchsia', 'orange'];
	const DOT_COLOR_MAP: Record<string, string> = {
		zinc: 'bg-zinc-400',
		blue: 'bg-blue-400',
		rose: 'bg-rose-400',
		emerald: 'bg-emerald-400',
		amber: 'bg-amber-400',
		indigo: 'bg-indigo-400',
		violet: 'bg-violet-400',
		cyan: 'bg-cyan-400',
		teal: 'bg-teal-400',
		fuchsia: 'bg-fuchsia-400',
		orange: 'bg-orange-400',
	};

	// Fetch initial data
	const fetchBoardData = useCallback(async () => {
		setIsLoading(true);

		const {
			data: {user},
		} = await supabase.auth.getUser();
		if (!user) {
			setIsLoading(false);
			return;
		}
		setCurrentUserId(user.id);

		// Fetch project details
		const {data: project} = await supabase.from('projects').select('title').eq('id', projectId).single();

		if (project) {
			setProjectName(project.title);

			// Fetch user role for this project
			const {data: member} = await supabase
				.from('project_members')
				.select('role')
				.eq('project_id', projectId)
				.eq('user_id', user.id)
				.single();

			if (member) {
				setCurrentUserRole(member.role);
			} else {
				// Check if user is the direct owner of the project
				const {data: directProject} = await supabase.from('projects').select('user_id').eq('id', projectId).single();

				if (directProject?.user_id === user.id) {
					setCurrentUserRole('owner');
				} else {
					setCurrentUserRole(null);
				}
			}
		}

		// Fetch columns (excluding archived ones, except the pool)
		const {data: cols} = await supabase
			.from('columns')
			.select('*')
			.eq('project_id', projectId)
			.or('archived_at.is.null,is_archive_pool.eq.true')
			.order('position');

		const finalCols = cols || [];

		// Sort columns: regular columns stay in order, archived pool always goes last
		const sortedCols = [...finalCols].sort((a, b) => {
			if (a.is_archive_pool) return 1;
			if (b.is_archive_pool) return -1;
			return a.position.localeCompare(b.position);
		});

		updateColumns(sortedCols);
		if (finalCols.length > 0 && !selectedColumnId) {
			// Prefer first non-archived column for selection
			const firstActive = finalCols.find((c) => !c.archived_at && !c.is_archive_pool);
			setSelectedColumnId(firstActive ? firstActive.id : finalCols[0].id);
		}

		if (finalCols.length > 0) {
			const colIds = finalCols.map((c: {id: string}) => c.id);
			const {data: tsks} = await supabase
				.from('tasks')
				.select('*')
				.in('column_id', colIds)
				.is('archived_at', null) // Fetch only non-archived for regular view
				.order('position');

			// Fetch archived tasks specifically for the archive pool
			const pool = finalCols.find((c) => c.is_archive_pool);
			if (pool) {
				const {data: archivedTsks} = await supabase
					.from('tasks')
					.select('*')
					.eq('column_id', pool.id)
					.not('archived_at', 'is', null)
					.order('archived_at', {ascending: false});

				if (tsks && archivedTsks) {
					updateTasks([...tsks, ...archivedTsks], true);
				} else if (tsks) {
					updateTasks(tsks, true);
				} else if (archivedTsks) {
					updateTasks(archivedTsks, true);
				}
			} else if (tsks) {
				updateTasks(tsks, true);
			}
		} else {
			updateTasks([], true);
		}
		setIsLoading(false);
	}, [projectId, selectedColumnId, updateColumns, updateTasks]);

	useEffect(() => {
		fetchBoardData();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const handleBroadcast = (payload: any) => {
			if (payload.event === 'cursor') {
				// We no longer update remoteCursors state to avoid unnecessary board re-renders
				// as it's not currently used in the visual layout.
				return;
			} else if (payload.event === 'drag') {
				const {userId, taskId, columnId, username} = payload.payload;
				if (userId !== currentUserId) {
					setRemoteDragging((prev) => ({...prev, [userId]: {taskId, columnId, username}}));
				}
			} else if (payload.event === 'drag-end') {
				const {userId} = payload.payload;
				setRemoteDragging((prev) => {
					const next = {...prev};
					delete next[userId];
					return next;
				});
			}
		};

		// Subscribe to real-time updates
		const channel = supabase.channel(`project:${projectId}`, {
			config: {
				presence: {
					key: currentUserId || 'anonymous',
				},
			},
		});
		channelRef.current = channel;

		channel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'columns',
					filter: `project_id=eq.${projectId}`,
				},
				async (payload) => {
					if (payload.eventType === 'INSERT') {
						const newCol = payload.new as ColumnType;
						updateColumns((prev) => {
							if (prev.some((c) => c.id === newCol.id)) return prev;
							if (newCol.is_archive_pool && prev.some((c) => c.is_archive_pool)) return prev;
							return [...prev, newCol];
						});
					} else if (payload.eventType === 'UPDATE') {
						const updatedCol = payload.new as ColumnType;
						if (updatedCol.archived_at && !updatedCol.is_archive_pool) {
							updateColumns((prev) => prev.filter((c) => c.id !== updatedCol.id));
						} else {
							updateColumns((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
						}
					} else if (payload.eventType === 'DELETE') {
						updateColumns((prev) => prev.filter((c) => c.id !== payload.old.id));
					}
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'tasks',
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					// Since we can't easily filter tasks by project_id in real-time filter (no column),
					// we filter locally using the current column list.
					if (payload.eventType === 'INSERT') {
						const newTask = payload.new as Task;
						updateTasks((prev) => {
							if (prev.some((t) => t.id === newTask.id)) return prev;
							return [...prev, newTask];
						}, true);
					} else if (payload.eventType === 'UPDATE') {
						const updatedTask = payload.new as Task;
						updateTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)), true);
					} else if (payload.eventType === 'DELETE') {
						updateTasks((prev) => prev.filter((t) => t.id !== payload.old.id), false);
					}
				},
			)
			.on('broadcast', {event: 'cursor'}, handleBroadcast)
			.on('broadcast', {event: 'drag'}, handleBroadcast)
			.on('broadcast', {event: 'drag-end'}, handleBroadcast)
			.on('presence', {event: 'sync'}, () => {
				const state = channel.presenceState();

				// Flatten all presences and deduplicate by user_id
				const allPresences = Object.values(state).flat();
				const uniqueUserMap = new Map();

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				allPresences.forEach((p: any) => {
					if (p.user_id) {
						// Newer connections for the same user will overwrite older ones in the Map
						uniqueUserMap.set(p.user_id, p);
					}
				});

				setCollaborators(Array.from(uniqueUserMap.values()));
			})
			.on('presence', {event: 'join'}, () => {})
			.on('presence', {event: 'leave'}, () => {})
			.subscribe(async (status) => {
				if (status === 'SUBSCRIBED') {
					const {
						data: {user},
					} = await supabase.auth.getUser();
					if (user) {
						// Fetch avatar from profiles
						const {data: profile} = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();

						await channel.track({
							user_id: user.id,
							username: profile?.username || user.user_metadata.username || user.email,
							avatar_url: profile?.avatar_url || '',
							online_at: new Date().toISOString(),
						});
					}
				}
			});

		return () => {
			window.removeEventListener('mousemove', throttleMouseMove);
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId, currentUserId]);

	// Broadcast mouse movements (throttled to 100ms for performance)
	const throttleMouseMove = useMemo(
		() =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			throttle((e: any) => {
				if (channelRef.current && currentUserId) {
					channelRef.current.send({
						type: 'broadcast',
						event: 'cursor',
						payload: {
							userId: currentUserId,
							username: collaborators.find((c) => c.user_id === currentUserId)?.username || 'Unknown',
							x: e.clientX,
							y: e.clientY,
						},
					});
				}
			}, 100),
		[currentUserId, collaborators],
	);

	useEffect(() => {
		window.addEventListener('mousemove', throttleMouseMove);
		return () => window.removeEventListener('mousemove', throttleMouseMove);
	}, [throttleMouseMove]);

	const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

	const isEditable = useMemo(() => {
		return currentUserRole === 'owner' || currentUserRole === 'editor';
	}, [currentUserRole]);

	const addTask = async (columnId: string, title: string, content: string, attachments: any[] = []) => {
		const colTasks = tasks.filter((t) => t.column_id === columnId);
		const lastTask = colTasks.length > 0 ? colTasks[colTasks.length - 1] : null;
		const newPos = generateKeyBetween(lastTask ? lastTask.position : null, null);

		const tempId = crypto.randomUUID();
		const nowStr = new Date().toISOString();
		const newTask: Task = {id: tempId, column_id: columnId, project_id: projectId, title, content, position: newPos, created_at: nowStr, attachments};
		updateTasks((prev) => [...prev, newTask]);

		// Close modal immediately for zero-latency UI
		setIsAddingTask(false);

		const {data} = await supabase
			.from('tasks')
			.insert({id: tempId, column_id: columnId, project_id: projectId, title, content, position: newPos, attachments})
			.select()
			.single();

		if (data) {
			updateTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)));
		}
	};

	// Modal Open Handlers
	const openShareModal = () => setIsSharing(true);
	const openAddTaskModal = (columnId?: string) => {
		if (!isEditable) return;
		if (columnId) setSelectedColumnId(columnId);
		setIsAddingTask(true);
	};
	const openAddColumnModal = () => {
		if (!isEditable) return;
		setIsAddingColumn(true);
	};

	const deleteTask = async (id: string) => {
		const task = tasks.find((t) => t.id === id);
		if (!task) return;

		const column = columns.find((c) => c.id === task.column_id);
		const archivePool = columns.find((c) => c.is_archive_pool);

		if (column?.is_archive_pool) {
			// Hard delete if already in archive
			updateTasks((prev) => prev.filter((t) => t.id !== id));
			await supabase.from('tasks').delete().eq('id', id);
		} else if (archivePool) {
			// Soft delete: move to archive pool, set archived_at, and remember current column
			const now = new Date().toISOString();
			const currentColumnId = task.column_id;
			const updatedTask = {...task, column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 'a0'};
			updateTasks((prev) => [updatedTask, ...prev.filter((t) => t.id !== id)]);
			await supabase
				.from('tasks')
				.update({column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 'a0'})
				.eq('id', id);

			showToast({
				type: 'info',
				title: 'Task Archived',
				message: `"${task.title}" moved to Archive.`,
				action: {
					label: 'Undo',
					onClick: () => restoreTask(id),
				},
			});
		} else {
			// Fallback to hard delete if no archive pool (though we ensure it exists)
			updateTasks((prev) => prev.filter((t) => t.id !== id));
			await supabase.from('tasks').delete().eq('id', id);
			showToast({
				type: 'info',
				title: 'Task Deleted',
				message: `"${task.title}" has been permanently removed.`,
			});
		}
	};

	const archiveColumn = async (id: string) => {
		const column = columns.find((c) => c.id === id);
		if (!column || column.is_archive_pool) return;

		const now = new Date().toISOString();
		updateColumns((prev) => prev.filter((c) => c.id !== id));
		// Tasks in this column are NOT automatically archived, they just become inaccessible via this board
		// until we decide if we want to move them. Common pattern is to let them be.
		if (selectedColumnId === id) setSelectedColumnId('');
		await supabase.from('columns').update({archived_at: now}).eq('id', id);
		showToast({
			type: 'info',
			title: 'Column Archived',
			message: `"${column.title}" has been moved to Archive.`,
			action: {
				label: 'Undo',
				onClick: async () => {
					updateColumns((prev) => [...prev, column]);
					const {error} = await supabase.from('columns').update({archived_at: null}).eq('id', id);
					if (!error) {
						showToast({
							type: 'success',
							title: 'Column Restored',
							message: `"${column.title}" is back on the board.`,
						});
					}
				},
			},
		});
	};

	const updateColumnColor = async (id: string, color: string) => {
		updateColumns((prev) => prev.map((c) => (c.id === id ? {...c, color} : c)));
		const {error} = await supabase.from('columns').update({color}).eq('id', id);
		if (!error) {
			showToast({
				type: 'success',
				title: 'Color Updated',
				message: 'Column color saved successfully.',
			});
		}
	};

	const updateColumnDetails = async (id: string, title: string, description: string | null) => {
		updateColumns((prev) => prev.map((c) => (c.id === id ? {...c, title, description} : c)));
		const {error} = await supabase.from('columns').update({title, description}).eq('id', id);
		if (!error) {
			showToast({
				type: 'success',
				title: 'Column Updated',
				message: `Column updated to "${title}".`,
			});
		}
	};

	const updateTask = async (id: string, title: string, content: string, attachments?: any[]) => {
		updateTasks((prev) => prev.map((t) => (t.id === id ? {...t, title, content, ...(attachments !== undefined && { attachments })} : t)));
		const updatePayload: any = {title, content};
		if (attachments !== undefined) updatePayload.attachments = attachments;
		const {error} = await supabase.from('tasks').update(updatePayload).eq('id', id);
		if (!error) {
			showToast({
				type: 'success',
				title: 'Task Updated',
				message: `Changes to "${title}" have been saved.`,
			});
		} else {
			showToast({
				type: 'error',
				title: 'Update Failed',
				message: `Could not save changes to "${title}".`,
			});
		}
	};

	const restoreTask = async (id: string) => {
		const task = tasks.find((t) => t.id === id);
		if (!task) return;

		// Determine target column: either the previous one or the first active one
		const targetColId = task.previous_column_id;
		const targetCol = columns.find((c) => c.id === targetColId && !c.archived_at);

		const firstActive = columns.find((c) => !c.archived_at && !c.is_archive_pool);
		const finalTargetId = targetCol ? targetCol.id : firstActive?.id;

		if (!finalTargetId) return;

		const colTasks = tasks.filter((t) => t.column_id === finalTargetId);
		const lastTask = colTasks.length > 0 ? colTasks[colTasks.length - 1] : null;
		const newPos = generateKeyBetween(lastTask ? lastTask.position : null, null);

		updateTasks((prev) =>
			prev.map((t) => (t.id === id ? {...t, column_id: finalTargetId, archived_at: null, previous_column_id: null, position: newPos} : t)),
		);
		const {error} = await supabase
			.from('tasks')
			.update({column_id: finalTargetId, archived_at: null, previous_column_id: null, position: newPos})
			.eq('id', id);
		if (!error) {
			showToast({
				type: 'success',
				title: 'Task Restored',
				message: `"${task.title}" is back in its original place.`,
			});
		}
	};

	const addColumn = async (title: string, color: string, description?: string) => {
		const archivePool = columns.find((c) => c.is_archive_pool);
		const regularCols = columns.filter((c) => !c.is_archive_pool);
		const lastCol = regularCols.length > 0 ? regularCols[regularCols.length - 1] : null;
		const newPos = generateKeyBetween(lastCol ? lastCol.position : null, null);

		// Optimistic update
		const tempId = crypto.randomUUID();
		const tempColumn: ColumnType = {
			id: tempId,
			project_id: projectId,
			title,
			description: description || null,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			color: color as any,
			position: newPos,
			created_at: new Date().toISOString(),
			archived_at: null,
			is_archive_pool: false,
		};

		if (archivePool) {
			updateColumns([...regularCols, tempColumn, archivePool]);
		} else {
			updateColumns([...regularCols, tempColumn]);
		}

		setIsAddingColumn(false);

		const {data} = await supabase.from('columns').insert({
			id: tempId, 
			project_id: projectId, 
			title, 
			description: description || null,
			color, 
			position: newPos
		}).select().single();

		if (data) {
			updateColumns((prev) => prev.map((c) => (c.id === tempId ? data : c)));

			if (!selectedColumnId) setSelectedColumnId(data.id);

			showToast({
				type: 'success',
				title: 'Column Added',
				message: `"${title}" column is now active.`,
			});
		}
	};

	const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5, delay: 0, tolerance: 5}}));

	const customCollisionDetection: CollisionDetection = (args) => {
		return closestCorners(args);
	};

	const onDragStart = (event: DragStartEvent) => {
		const {active} = event;
		const type = active.data.current?.type;

		if (type === 'Column' && active.data.current) {
			setActiveColumn(active.data.current.column);
			return;
		}

		if (type === 'Task' && active.data.current) {
			setActiveTask(active.data.current.task);
			initialColumnIdRef.current = active.data.current.task.column_id;
			// Broadcast start of drag using ref
			const channel = channelRef.current;
			if (channel && currentUserId) {
				channel.send({
					type: 'broadcast',
					event: 'drag',
					payload: {
						userId: currentUserId,
						username: collaborators.find((c) => c.user_id === currentUserId)?.username || 'Unknown',
						taskId: active.id,
						columnId: active.data.current.task.column_id,
					},
				});
			}
			return;
		}
	};

	const onDragOver = (event: DragOverEvent) => {
		const {active, over} = event;
		if (!over) return;

		const activeId = active.id;
		const overId = over.id;

		if (activeId === overId) return;

		const isActiveTask = active.data.current?.type === 'Task';
		const isOverTask = over.data.current?.type === 'Task';
		const isOverColumn = over.data.current?.type === 'Column';

		if (!isActiveTask) return;

		// Dropping a Task over another Task
		if (isActiveTask && isOverTask) {
			updateTasks((tasks) => {
				const activeIndex = tasks.findIndex((t) => t.id === activeId);
				const overIndex = tasks.findIndex((t) => t.id === overId);

				const newTasks = [...tasks];
				newTasks[activeIndex] = {
					...tasks[activeIndex],
					column_id: tasks[overIndex].column_id,
				};

				const result = arrayMove(newTasks, activeIndex, overIndex);

				// Broadcast movement using ref
				const channel = channelRef.current;
				if (channel && currentUserId) {
					channel.send({
						type: 'broadcast',
						event: 'drag',
						payload: {
							userId: currentUserId,
							username: collaborators.find((c) => c.user_id === currentUserId)?.username || 'Unknown',
							taskId: activeId,
							columnId: tasks[overIndex].column_id,
						},
					});
				}

				return result;
			});
		}

		// Dropping a Task over a Column
		if (isActiveTask && isOverColumn) {
			updateTasks((tasks) => {
				const activeIndex = tasks.findIndex((t) => t.id === activeId);
				const newTasks = [...tasks];
				newTasks[activeIndex] = {
					...tasks[activeIndex],
					column_id: overId as string,
				};

				const result = arrayMove(newTasks, activeIndex, activeIndex);

				// Broadcast movement using ref
				const channel = channelRef.current;
				if (channel && currentUserId) {
					channel.send({
						type: 'broadcast',
						event: 'drag',
						payload: {
							userId: currentUserId,
							username: collaborators.find((c) => c.user_id === currentUserId)?.username || 'Unknown',
							taskId: activeId,
							columnId: overId,
						},
					});
				}

				return result;
			});
		}
	};

	const onDragEnd = async (event: DragEndEvent) => {
		// 1. Broadcast and reset UI state immediately
		const channel = channelRef.current;
		if (channel && currentUserId) {
			channel.send({
				type: 'broadcast',
				event: 'drag-end',
				payload: {userId: currentUserId},
			});
		}

		setActiveColumn(null);
		setActiveTask(null);

		const {active, over} = event;
		if (!over) {
			initialColumnIdRef.current = null;
			return;
		}

		const activeId = active.id;
		const overId = over.id;

		// Use current refs to avoid stale closures
		const currentCols = columnsRef.current;
		const currentTasks = tasksRef.current;
		const initialColumnId = initialColumnIdRef.current;

		initialColumnIdRef.current = null; // Clear for next operation

		if (activeId === overId && !initialColumnId) return;

		// --- HANDLE COLUMN DRAG ---
		const isActiveColumn = active.data.current?.type === 'Column';
		if (isActiveColumn) {
			const activeColIndex = currentCols.findIndex((col) => col.id === activeId);
			const overColIndex = currentCols.findIndex((col) => col.id === overId);

			const newColumns = arrayMove(currentCols, activeColIndex, overColIndex);
			const finalColumns = [...newColumns].sort((a, b) => {
				if (a.is_archive_pool) return 1;
				if (b.is_archive_pool) return -1;
				return 0; // maintain arrayMove order
			});

			const newIndex = finalColumns.findIndex((col) => col.id === activeId);
			const prevCol = newIndex > 0 ? finalColumns[newIndex - 1] : null;
			const nextCol = newIndex < finalColumns.length - 1 ? finalColumns[newIndex + 1] : null;

			const newPos = generateKeyBetween(
				prevCol ? prevCol.position : null,
				nextCol && !nextCol.is_archive_pool ? nextCol.position : null
			);

			updateColumns((prev) => prev.map((c) => (c.id === activeId ? {...c, position: newPos} : c)));

			try {
				const {error} = await supabase.from('columns').update({position: newPos}).eq('id', activeId);
				if (error) throw error;
				showToast({
					type: 'success',
					title: 'Board Updated',
					message: 'Column arrangement saved.',
				});
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				console.error('Column persistence error:', err);
				showToast({
					type: 'error',
					title: 'Save Failed',
					message: err.message || 'Could not save column order.',
				});
			}
			return;
		}

		// --- HANDLE TASK DRAG ---
		const isActiveTask = active.data.current?.type === 'Task';
		if (isActiveTask) {
			const activeTaskInState = currentTasks.find((t) => t.id === activeId);
			if (!activeTaskInState) return;

			const targetColumnId = activeTaskInState.column_id;
			const colTasks = currentTasks.filter((t) => t.column_id === targetColumnId);
			const newIndex = colTasks.findIndex((t) => t.id === activeId);

			const prevTask = newIndex > 0 ? colTasks[newIndex - 1] : null;
			const nextTask = newIndex < colTasks.length - 1 ? colTasks[newIndex + 1] : null;

			const newPos = generateKeyBetween(
				prevTask ? prevTask.position : null,
				nextTask ? nextTask.position : null
			);

			const targetColumn = currentCols.find((c) => c.id === targetColumnId);
			if (targetColumn?.is_archive_pool && initialColumnId && initialColumnId !== targetColumnId) {
				setPendingArchiveDrag({
					activeId:String(activeId),
					targetColumnId,
					initialColumnId,
					newPos,
					activeTaskInState,
				});
				return;
			}

			updateTasks((prev) => prev.map((t) => (t.id === activeId ? {...t, position: newPos} : t)));

			try {
				const {error} = await supabase.from('tasks').update({column_id: targetColumnId, position: newPos}).eq('id', activeId);
				if (error) throw error;

				showToast({
					type: 'success',
					title: 'Board Updated',
					message:
						initialColumnId === targetColumnId ? 'Task order saved.' : (
							`"${activeTaskInState.title}" moved to ${targetColumn?.title || 'new column'}.`
						),
				});
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				console.error('Task persistence error:', err);
				showToast({
					type: 'error',
					title: 'Sync Error',
					message: 'Could not save changes. Refreshing...',
				});
				fetchBoardData(); // Force sync with server
			}
		}
	};

	if (isLoading) {
		return <BoardSkeleton />;
	}


	return (
		<div className='flex flex-col h-full w-full min-w-0 overflow-hidden touch-none relative'>
			<DndContext
				sensors={sensors}
				collisionDetection={customCollisionDetection}
				onDragStart={onDragStart}
				onDragOver={onDragOver}
				onDragEnd={onDragEnd}
				autoScroll={false}
				measuring={{
					droppable: {
						strategy: MeasuringStrategy.Always,
					},
				}}>
				{/* Canvas Header Bar */}
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 lg:px-6 py-4 sm:py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 glass z-[60] gap-4 sm:gap-2'>
					<div className='flex items-center gap-3 lg:gap-4 overflow-hidden w-full sm:w-auto'>
						<div className='flex items-center gap-2 overflow-hidden'>
							<ActionIcon
								variant="subtle" color="gray" size="lg"
								onClick={(e) => {
									e.stopPropagation();
									onToggleSidebar();
								}}
								aria-label="Toggle Sidebar"
							>
								<IconLayoutDashboard size={18} className="lg:hidden" />
								<IconColumns size={18} className="hidden lg:block text-zinc-500" />
							</ActionIcon>
							<h2 className='text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate '>
								{projectName || 'Board Canvas'}
							</h2>
							{!isEditable && (
								<div className='flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-500 uppercase animate-in fade-in slide-in-from-left-2 duration-300'>
									<IconLock size={12} />
									<span>View Only</span>
								</div>
							)}
						</div>
						<div className='hidden lg:block h-4 w-px bg-zinc-200 dark:bg-zinc-800' />
						<span className='hidden lg:block text-[10px] text-zinc-500 font-bold uppercase '>
							{columns.length} Columns • {tasks.length} Tasks
						</span>
						<div className='h-4 w-px bg-zinc-200 dark:bg-zinc-800' />
						<div
							className='flex -space-x-2 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity active:scale-95'
							onClick={openShareModal}>
							{collaborators.map((collab, idx) => (
								<Tooltip
									key={idx}
									label={collab.username || 'Collaborator'} position="bottom" withArrow>
									<Avatar
										src={collab.avatar_url || null}
										radius="xl"
										size="sm"
										className='ring-2 ring-white dark:ring-zinc-950 shadow-sm'
									>
										{collab.username?.charAt(0).toUpperCase()}
									</Avatar>
								</Tooltip>
							))}
							{collaborators.length === 0 && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										openShareModal();
									}}
									className='flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold uppercase transition-colors'>
									<IconUsers size={14} />
									<span>Just you</span>
								</button>
							)}
						</div>
					</div>

					<div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
						<Button
							onClick={() => openAddTaskModal()}
							disabled={columns.length === 0 || !isEditable}
							color="dark"
							radius="xl"
							size="xs"
							leftSection={<IconPlus size={14} />}>
							Task
						</Button>
						<div className='flex items-center gap-3'>
							{isEditable && (
								<Button
									onClick={openAddColumnModal}
									color="dark"
									radius="xl"
									size="xs"
									leftSection={<IconPlus size={16} />}
									className='hidden sm:flex'>
									Add Column
								</Button>
							)}
							{currentUserRole === 'owner' && (
								<Button
									onClick={openShareModal}
									variant="default"
									radius="xl"
									size="xs"
									leftSection={<IconShare size={16} />}>
									Share
								</Button>
							)}
						</div>
					</div>
				</div>

				<TransformWrapper
					initialScale={1}
					minScale={0.1}
					maxScale={2}
					wheel={{step: 0.08}}
					pinch={{step: 5}}
					doubleClick={{disabled: true}}
					panning={{
						excluded: ['no-pan', 'input', 'textarea', 'button', 'select'],
						velocityDisabled: true,
					}}
					limitToBounds={false}>
					<TransformComponent
						wrapperStyle={{width: '100%', height: '100%', overflow: 'hidden'}}
						contentStyle={{width: 'max-content', height: 'max-content', padding: '80px 32px 300px 32px'}}>
						<div className='flex gap-6 items-start'>
							<SortableContext
								items={columnsId}
								strategy={horizontalListSortingStrategy}>
								{columns.map((col) => (
									<Column
										key={col.id}
										column={col}
										remoteDragging={Object.values(remoteDragging).filter((d) => d.columnId === col.id)}
										tasks={tasks.filter((t) => t.column_id === col.id)}
										archiveColumn={archiveColumn}
										deleteTask={deleteTask}
										restoreTask={async (id) => {
											await restoreTask(id);
										}}
										addTask={addTask}
										onAddTaskClick={() => {
											openAddTaskModal(col.id);
										}}
										updateTask={updateTask}
										updateColumnColor={updateColumnColor}
										updateColumnDetails={updateColumnDetails}
										isEditable={isEditable}
									/>
								))}
							</SortableContext>

							{isEditable && (
								<button
									onClick={openAddColumnModal}
									className='no-pan w-80 shrink-0 h-[60px] flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer group'>
									<IconPlus size={20} className='group-hover:scale-110 transition-transform' />
									<span className='font-medium text-sm'>Add another column</span>
								</button>
							)}
						</div>
					</TransformComponent>

					{/* Navigation Controls */}
					<ZoomControls />
				</TransformWrapper>

				{typeof window !== 'undefined' &&
					createPortal(
						<DragOverlay dropAnimation={null}>
							{activeColumn && (
								<Column
									column={activeColumn}
									tasks={tasks.filter((t) => t.column_id === activeColumn.id)}
									archiveColumn={() => {}}
									deleteTask={() => {}}
									restoreTask={async () => {}}
									addTask={async () => {}}
									updateTask={updateTask}
									updateColumnColor={updateColumnColor}
									updateColumnDetails={updateColumnDetails}
									isOverlay
								/>
							)}
							{activeTask && (
								<TaskCard
									task={activeTask}
									deleteTask={deleteTask}
									isOverlay
								/>
							)}
						</DragOverlay>,
						document.body,
					)}
			</DndContext>

			{/* Modal Components */}
			<AddTaskModal
				isOpen={isAddingTask}
				onClose={() => setIsAddingTask(false)}
				columns={columns}
				selectedColumnId={selectedColumnId}
				onSelectedColumnIdChange={setSelectedColumnId}
				onAddTask={addTask}
			/>
			<AddColumnModal
				isOpen={isAddingColumn}
				onClose={() => setIsAddingColumn(false)}
				onAddColumn={addColumn}
				availableColors={AVAILABLE_COLORS}
				dotColorMap={DOT_COLOR_MAP}
			/>
			<ShareModal
				isOpen={isSharing}
				onClose={() => setIsSharing(false)}
				projectId={projectId}
				currentUserId={currentUserId}
			/>
			<Modal opened={!!pendingArchiveDrag} onClose={cancelArchiveDrag} title="Archive Task" centered>
				<Text size="sm" mb="lg">
					Are you sure you want to drop this task into the Archive column? It will be hidden from the main board until restored.
				</Text>
				<Group justify="flex-end">
					<Button variant="default" onClick={cancelArchiveDrag}>
						Cancel
					</Button>
					<Button color="red" onClick={confirmArchiveDrag}>
						Archive
					</Button>
				</Group>
			</Modal>
		</div>
	);
}
