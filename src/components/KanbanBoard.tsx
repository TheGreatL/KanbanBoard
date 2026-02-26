import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from "react-zoom-pan-pinch";
import Column, { ColumnType } from "./Column";
import TaskCard, { Task } from "./TaskCard";
import { supabase } from "@/lib/supabase";
import { Plus, Loader2, ZoomIn, ZoomOut, LayoutList, AlignLeft, X, Check, Columns, Maximize, Users, Share2, Search, UserPlus, UserMinus } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";
interface KanbanBoardProps {
  projectId: string;
}

// Separate component so it can use useControls() inside TransformWrapper context
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [displayScale, setDisplayScale] = useState(100);

  useTransformEffect(({ state }) => {
    setDisplayScale(Math.round(state.scale * 100));
  });

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm select-none z-50 no-pan">
      <Tooltip text="Zoom Out">
        <button
          onClick={() => zoomOut(0.2)}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </Tooltip>
      <Tooltip text="Zoom In">
        <button
          onClick={() => zoomIn(0.2)}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </Tooltip>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
      <Tooltip text="Reset Camera">
        <button
          onClick={() => resetTransform()}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </Tooltip>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
      <Tooltip text="Current Zoom">
        <div
          className="px-3 py-2 text-zinc-500 flex items-center justify-center min-w-[60px]"
        >
          <span className="text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-600">{displayScale}%</span>
        </div>
      </Tooltip>
    </div>
  );
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [projectName, setProjectName] = useState("");
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Global Add Task Modal State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTitleInputRef = useRef<HTMLInputElement>(null);

  // Add Column Modal State
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("zinc");
  const columnTitleInputRef = useRef<HTMLInputElement>(null);

  // Share Modal State
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [invitingRole, setInvitingRole] = useState("editor");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Advanced Realtime State
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; username: string }>>({});
  const [remoteDragging, setRemoteDragging] = useState<Record<string, { taskId: string; columnId: string; username: string }>>({});
  const channelRef = useRef<any>(null);

  const AVAILABLE_COLORS = ["zinc", "blue", "rose", "emerald", "amber", "indigo", "violet", "cyan", "teal", "fuchsia", "orange"];
  const DOT_COLOR_MAP: Record<string, string> = {
    zinc: "bg-zinc-400",
    blue: "bg-blue-400",
    rose: "bg-rose-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    indigo: "bg-indigo-400",
    violet: "bg-violet-400",
    cyan: "bg-cyan-400",
    teal: "bg-teal-400",
    fuchsia: "bg-fuchsia-400",
    orange: "bg-orange-400",
  };

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      // Fetch project details
      const { data: project } = await supabase
        .from("projects")
        .select("title")
        .eq("id", projectId)
        .single();
      
      if (project) {
        setProjectName(project.title);
      }

      // Fetch columns (excluding archived ones, except the pool)
      const { data: cols } = await supabase
        .from("columns")
        .select("*")
        .eq("project_id", projectId)
        .or("archived_at.is.null,is_archive_pool.eq.true")
        .order("position");

      let finalCols = cols || [];

      // De-duplicate archive pools if they exist (legacy cleanup/safety)
      const archivePools = finalCols.filter(c => c.is_archive_pool);
      if (archivePools.length > 1) {
        const keepId = archivePools[0].id;
        finalCols = finalCols.filter(c => !c.is_archive_pool || c.id === keepId);
      }

      // Ensure Archived column exists for this project
      const archivePool = finalCols.find(c => c.is_archive_pool);
      if (!archivePool) {
        const { data: newPool } = await supabase
          .from("columns")
          .insert({ 
            project_id: projectId, 
            title: "Archived", 
            color: "zinc", 
            position: finalCols.length, 
            is_archive_pool: true 
          })
          .select()
          .single();
        
        if (newPool) {
          finalCols = [...finalCols, newPool];
        }
      }

      // Sort columns: regular columns stay in order, archived pool always goes last
      const sortedCols = [...finalCols].sort((a, b) => {
        if (a.is_archive_pool) return 1;
        if (b.is_archive_pool) return -1;
        return a.position - b.position;
      });

      setColumns(sortedCols);
      if (finalCols.length > 0 && !selectedColumnId) {
        // Prefer first non-archived column for selection
        const firstActive = finalCols.find(c => !c.archived_at && !c.is_archive_pool);
        setSelectedColumnId(firstActive ? firstActive.id : finalCols[0].id);
      }

      if (finalCols.length > 0) {
        const colIds = finalCols.map((c: { id: string }) => c.id);
        const { data: tsks } = await supabase
          .from("tasks")
          .select("*")
          .in("column_id", colIds)
          .is("archived_at", null) // Fetch only non-archived for regular view
          .order("position");
        
        // Fetch archived tasks specifically for the archive pool
        const pool = finalCols.find(c => c.is_archive_pool);
        if (pool) {
          const { data: archivedTsks } = await supabase
            .from("tasks")
            .select("*")
            .eq("column_id", pool.id)
            .not("archived_at", "is", null)
            .order("archived_at", { ascending: false });
          
          if (tsks && archivedTsks) {
            setTasks([...tsks, ...archivedTsks]);
          } else if (tsks) {
            setTasks(tsks);
          } else if (archivedTsks) {
            setTasks(archivedTsks);
          }
        } else if (tsks) {
          setTasks(tsks);
        }
      } else {
        setTasks([]);
      }
      setIsLoading(false);
    }
    fetchData();

    const handleBroadcast = (payload: any) => {
      if (payload.event === "cursor") {
        const { userId, x, y, username } = payload.payload;
        if (userId !== currentUserId) {
          setRemoteCursors((prev) => ({ ...prev, [userId]: { x, y, username } }));
        }
      } else if (payload.event === "drag") {
        const { userId, taskId, columnId, username } = payload.payload;
        if (userId !== currentUserId) {
          setRemoteDragging((prev) => ({ ...prev, [userId]: { taskId, columnId, username } }));
        }
      } else if (payload.event === "drag-end") {
        const { userId } = payload.payload;
        setRemoteDragging((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    // Subscribe to real-time updates
    const channel = supabase.channel(`project:${projectId}`, {
      config: {
        presence: {
          key: projectId,
        },
      },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "columns",
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newCol = payload.new as ColumnType;
            setColumns((prev) => {
              if (prev.some((c) => c.id === newCol.id)) return prev;
              // Prevent duplicate archive pools in real-time
              if (newCol.is_archive_pool && prev.some(c => c.is_archive_pool)) return prev;
              
              const next = [...prev, newCol].sort((a, b) => {
                if (a.is_archive_pool) return 1;
                if (b.is_archive_pool) return -1;
                return a.position - b.position;
              });
              return next;
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedCol = payload.new as ColumnType;
            if (updatedCol.archived_at && !updatedCol.is_archive_pool) {
              setColumns((prev) => prev.filter((c) => c.id !== updatedCol.id));
            } else {
              setColumns((prev) =>
                prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)).sort((a, b) => {
                  if (a.is_archive_pool) return 1;
                  if (b.is_archive_pool) return -1;
                  return a.position - b.position;
                })
              );
            }
          } else if (payload.eventType === "DELETE") {
            setColumns((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Since we can't easily filter tasks by project_id in real-time filter (no column),
          // we filter locally using the current column list.
          if (payload.eventType === "INSERT") {
            const newTask = payload.new as Task;
            setTasks((prev) => {
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .on("broadcast", { event: "cursor" }, handleBroadcast)
      .on("broadcast", { event: "drag" }, handleBroadcast)
      .on("broadcast", { event: "drag-end" }, handleBroadcast)
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setCollaborators(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("join", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("leave", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              username: user.user_metadata.username || user.email,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      window.removeEventListener("mousemove", throttleMouseMove);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [projectId, currentUserId]);

  // Broadcast mouse movements
  const throttleMouseMove = useCallback((e: MouseEvent) => {
    if (channelRef.current && currentUserId) {
      channelRef.current.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: currentUserId,
          username: collaborators.find(c => c.user_id === currentUserId)?.username || "Unknown",
          x: e.clientX,
          y: e.clientY,
        },
      });
    }
  }, [currentUserId, collaborators]);

  useEffect(() => {
    window.addEventListener("mousemove", throttleMouseMove);
    return () => window.removeEventListener("mousemove", throttleMouseMove);
  }, [throttleMouseMove]);

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const addTask = async (columnId: string, title: string, content: string) => {
    const colTasks = tasks.filter((t) => t.column_id === columnId);
    const newPos = colTasks.length > 0 ? colTasks[colTasks.length - 1].position + 1 : 0;

    const tempId = `temp-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newTask: Task = { id: tempId, column_id: columnId, project_id: projectId, title, content, position: newPos, created_at: nowStr };
    setTasks((prev) => [...prev, newTask]);

    const { data } = await supabase
      .from("tasks")
      .insert({ column_id: columnId, project_id: projectId, title, content, position: newPos })
      .select()
      .single();

    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)));
    }
  };

  const handleGlobalAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedColumnId) return;
    const trimTitle = newTaskTitle.trim();
    const trimContent = newTaskContent.trim();
    if (!trimTitle && !trimContent) return;

    setIsSubmitting(true);
    await addTask(selectedColumnId, trimTitle, trimContent);
    setNewTaskTitle("");
    setNewTaskContent("");
    setIsSubmitting(false);
    setIsAddingTask(false);
  };

  const updateTask = async (id: string, title: string, content: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title, content } : t)));
    await supabase.from("tasks").update({ title, content }).eq("id", id);
  };

  const restoreTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Determine target column: either the previous one or the first active one
    const targetColId = task.previous_column_id;
    const targetCol = columns.find(c => c.id === targetColId && !c.archived_at);
    
    const firstActive = columns.find(c => !c.archived_at && !c.is_archive_pool);
    const finalTargetId = targetCol ? targetCol.id : firstActive?.id;

    if (!finalTargetId) return;

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column_id: finalTargetId, archived_at: null, previous_column_id: null, position: 0 } : t)));
    await supabase.from("tasks").update({ column_id: finalTargetId, archived_at: null, previous_column_id: null, position: 0 }).eq("id", id);
  };

  const addColumn = async (title: string, color: string) => {
    // New column should go before the "Archived" column
    // The "Archived" column should always be at the highest position
    const archivePool = columns.find(c => c.is_archive_pool);
    const regularCols = columns.filter(c => !c.is_archive_pool);
    const newPos = regularCols.length;

    const { data } = await supabase
      .from("columns")
      .insert({ project_id: projectId, title, color, position: newPos })
      .select()
      .single();

    if (data) {
      // If we have an archive pool, we need to make sure it's still at the end
      if (archivePool) {
        const updatedPool = { ...archivePool, position: newPos + 1 };
        setColumns([...regularCols, data, updatedPool]);
        // Update archive pool position in DB too
        await supabase.from("columns").update({ position: newPos + 1 }).eq("id", archivePool.id);
      } else {
        setColumns([...regularCols, data]);
      }
      if (!selectedColumnId) setSelectedColumnId(data.id);
    }
  };

  const handleGlobalAddColumn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimTitle = newColumnTitle.trim();
    if (!trimTitle) return;

    setIsSubmitting(true);
    await addColumn(trimTitle, newColumnColor);
    setNewColumnTitle("");
    setNewColumnColor("zinc");
    setIsSubmitting(false);
    setIsAddingColumn(false);
  };

  const fetchProjectMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    
    const { data } = await supabase
      .from("project_members")
      .select("*, profile:profiles(username)")
      .eq("project_id", projectId);
    if (data) setProjectMembers(data);
  };

  useEffect(() => {
    if (isSharing) fetchProjectMembers();
  }, [isSharing, projectId]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${query}%`)
      .limit(5);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const addProjectMember = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId, role: invitingRole });
    
    if (!error) {
      await fetchProjectMembers();
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeProjectMember = async (memberId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);
    
    if (!error) {
      await fetchProjectMembers();
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const column = columns.find(c => c.id === task.column_id);
    const archivePool = columns.find(c => c.is_archive_pool);

    if (column?.is_archive_pool) {
      // Hard delete if already in archive
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
    } else if (archivePool) {
      // Soft delete: move to archive pool, set archived_at, and remember current column
      const now = new Date().toISOString();
      const currentColumnId = task.column_id;
      const updatedTask = { ...task, column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 0 };
      setTasks((prev) => [updatedTask, ...prev.filter((t) => t.id !== id)]);
      await supabase.from("tasks").update({ column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 0 }).eq("id", id);
    } else {
      // Fallback to hard delete if no archive pool (though we ensure it exists)
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
    }
  };

  const archiveColumn = async (id: string) => {
    const column = columns.find(c => c.id === id);
    if (!column || column.is_archive_pool) return;

    const now = new Date().toISOString();
    setColumns((prev) => prev.filter((c) => c.id !== id));
    // Tasks in this column are NOT automatically archived, they just become inaccessible via this board
    // until we decide if we want to move them. Common pattern is to let them be.
    if (selectedColumnId === id) setSelectedColumnId("");
    await supabase.from("columns").update({ archived_at: now }).eq("id", id);
  };

  const updateColumnColor = async (id: string, color: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    await supabase.from("columns").update({ color }).eq("id", id);
  };

  const updateColumnTitle = async (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await supabase.from("columns").update({ title }).eq("id", id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5, delay: 0, tolerance: 5 } })
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    return closestCorners(args);
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "Column" && active.data.current) {
      setActiveColumn(active.data.current.column);
      return;
    }

    if (type === "Task" && active.data.current) {
      setActiveTask(active.data.current.task);
      // Broadcast start of drag
      const channel = supabase.channel(`project:${projectId}`);
      if (channel && currentUserId) {
        channel.send({
          type: "broadcast",
          event: "drag",
          payload: {
            userId: currentUserId,
            username: collaborators.find(c => c.user_id === currentUserId)?.username || "Unknown",
            taskId: active.id,
            columnId: active.data.current.task.column_id,
          },
        });
      }
      return;
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        const newTasks = [...tasks];
        newTasks[activeIndex] = {
          ...tasks[activeIndex],
          column_id: tasks[overIndex].column_id,
        };

        const result = arrayMove(newTasks, activeIndex, overIndex);
        
        // Broadcast movement
        const channel = supabase.channel(`project:${projectId}`);
        if (channel && currentUserId) {
          channel.send({
            type: "broadcast",
            event: "drag",
            payload: {
              userId: currentUserId,
              username: collaborators.find(c => c.user_id === currentUserId)?.username || "Unknown",
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
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex] = {
          ...tasks[activeIndex],
          column_id: overId as string,
        };

        const result = arrayMove(newTasks, activeIndex, activeIndex);
        
        // Broadcast movement
        const channel = supabase.channel(`project:${projectId}`);
        if (channel && currentUserId) {
          channel.send({
            type: "broadcast",
            event: "drag",
            payload: {
              userId: currentUserId,
              username: collaborators.find(c => c.user_id === currentUserId)?.username || "Unknown",
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
    // Broadcast end of drag
    const channel = supabase.channel(`project:${projectId}`);
    if (channel && currentUserId) {
      channel.send({
        type: "broadcast",
        event: "drag-end",
        payload: { userId: currentUserId },
      });
    }

    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveColumn = active.data.current?.type === "Column";
    if (isActiveColumn) {
      const activeColIndex = columns.findIndex((col) => col.id === activeId);
      const overColId = overId.toString();
      const overColIndex = columns.findIndex((col) => col.id === overId);
      
      const overCol = columns[overColIndex];
      // Prevent dragging a regular column AFTER the archive pool
      // Or prevent dragging the archive pool itself if we wanted (but Column.tsx already prevents dragging handle)
      
      const newColumns = arrayMove(columns, activeColIndex, overColIndex);

      // Final sanity check to ensure archive_pool is last
      const finalColumns = [...newColumns].sort((a, b) => {
        if (a.is_archive_pool) return 1;
        if (b.is_archive_pool) return -1;
        return 0; // Maintain relative order from arrayMove
      });

      setColumns(finalColumns.map((col, idx) => ({ ...col, position: idx })));
      for (const [idx, col] of finalColumns.entries()) {
        supabase.from("columns").update({ position: idx }).eq("id", col.id).then();
      }
      return;
    }

    const isActiveTask = active.data.current?.type === "Task";
    if (isActiveTask) {
      const activeObj = tasks.find((t) => t.id === activeId);
      if (!activeObj) return;

      const colTasks = tasks.filter((t) => t.column_id === activeObj.column_id);

      for (const [idx, tsk] of colTasks.entries()) {
        if (tsk.id === activeId) {
          supabase.from("tasks").update({ column_id: activeObj.column_id, position: idx }).eq("id", activeId).then();
        } else if (tsk.position !== idx) {
          supabase.from("tasks").update({ position: idx }).eq("id", tsk.id).then();
        }
      }
    }
  }

  // Focus/Select input when modals open
  useEffect(() => {
    if (isAddingTask) {
      setTimeout(() => {
        addTitleInputRef.current?.focus();
        addTitleInputRef.current?.select();
      }, 50);
    }
  }, [isAddingTask]);

  useEffect(() => {
    if (isAddingColumn) {
      setTimeout(() => {
        columnTitleInputRef.current?.focus();
        columnTitleInputRef.current?.select();
      }, 50);
    }
  }, [isAddingColumn]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  const openGlobalAddTask = (columnId?: string) => {
    if (columnId) {
      setSelectedColumnId(columnId);
    } else if (columns.length > 0 && !selectedColumnId) {
      setSelectedColumnId(columns[0].id);
    }
    setIsAddingTask(true);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden touch-none relative">
      {/* Canvas Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-[60]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Columns className="w-4 h-4 text-zinc-500" />
            {projectName || "Board Canvas"}
          </h2>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-500 font-medium">{columns.length} Columns • {tasks.length} Tasks</span>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex -space-x-2 overflow-hidden">
            {collaborators.map((collab, idx) => (
              <Tooltip key={idx} text={collab.username || "Collaborator"}>
                <div
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                >
                  {collab.username?.charAt(0).toUpperCase()}
                </div>
              </Tooltip>
            ))}
            {collaborators.length === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Users className="w-3 h-3" />
                <span>Just you</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openGlobalAddTask()}
            disabled={columns.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Column
          </button>
          <button
            onClick={() => setIsSharing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={2}
        wheel={{ step: 0.08 }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: true }}
        panning={{
          excluded: ["no-pan", "input", "textarea", "button", "select"],
          velocityDisabled: true,
        }}
        limitToBounds={false}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%", overflow: "hidden" }}
          contentStyle={{ width: "max-content", height: "max-content", padding: "80px 32px 300px 32px" }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            autoScroll={false}
          >
            <div className="flex gap-6 items-start">
              <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <Column
                    key={col.id}
                    column={col}
                    remoteDragging={Object.values(remoteDragging).filter(d => d.columnId === col.id)}
                    tasks={tasks.filter((t) => t.column_id === col.id)}
                    archiveColumn={archiveColumn}
                    deleteTask={deleteTask}
                    restoreTask={async (id) => {
                      await restoreTask(id);
                    }}
                    addTask={addTask}
                    onAddTaskClick={() => {
                      setSelectedColumnId(col.id);
                      setIsAddingTask(true);
                    }}
                    updateTask={updateTask}
                    updateColumnColor={updateColumnColor}
                    updateColumnTitle={updateColumnTitle}
                  />
                ))}
              </SortableContext>

              <button
                onClick={() => setIsAddingColumn(true)}
                className="no-pan w-80 shrink-0 h-[60px] flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Add another column</span>
              </button>
            </div>

            {typeof window !== "undefined" &&
              createPortal(
                <DragOverlay>
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
                      updateColumnTitle={updateColumnTitle}
                      isOverlay
                    />
                  )}
                  {activeTask && <TaskCard task={activeTask} deleteTask={deleteTask} isOverlay />}
                </DragOverlay>,
                document.body
              )}
          </DndContext>
        </TransformComponent>

        {/* Navigation Controls */}
        <ZoomControls />
      </TransformWrapper>

      {/* Global Add Task Modal — portalled to document.body */}
      {isAddingTask && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsAddingTask(false);
                setNewTaskTitle("");
                setNewTaskContent("");
              }
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
                <Plus className="w-4 h-4" />
                <h2>Create New Task</h2>
              </div>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle("");
                  setNewTaskContent("");
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Select Column
                </label>
                <select
                  value={selectedColumnId}
                  onChange={(e) => setSelectedColumnId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <LayoutList className="w-3 h-3" />
                  Task Title
                </label>
                <input
                  ref={addTitleInputRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <AlignLeft className="w-3 h-3" />
                  Description
                </label>
                <textarea
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  placeholder="Add some details..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle("");
                  setNewTaskContent("");
                }}
                className="px-4 cursor-pointer py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGlobalAddTask()}
                disabled={isSubmitting || (!newTaskTitle.trim() && !newTaskContent.trim())}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create Task
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Global Add Column Modal — portalled to document.body */}
      {isAddingColumn && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsAddingColumn(false);
                setNewColumnTitle("");
                setNewColumnColor("zinc");
              }
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
                <Columns className="w-4 h-4 text-zinc-500" />
                <h2>Add New Column</h2>
              </div>
              <button
                onClick={() => {
                  setIsAddingColumn(false);
                  setNewColumnTitle("");
                  setNewColumnColor("zinc");
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Column Name
                </label>
                <input
                  ref={columnTitleInputRef}
                  autoFocus
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGlobalAddColumn();
                  }}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                  placeholder="e.g. In Progress, Done..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {AVAILABLE_COLORS.map((color) => (
                      <Tooltip key={color} text={color}>
                        <button
                          onClick={() => setNewColumnColor(color)}
                          className={`w-full aspect-square rounded-full ${DOT_COLOR_MAP[color]} hover:scale-110 transition-transform flex items-center justify-center cursor-pointer ${newColumnColor === color ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950 shadow-sm' : ''}`}
                        >
                          {newColumnColor === color && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setIsAddingColumn(false);
                  setNewColumnTitle("");
                  setNewColumnColor("zinc");
                }}
                className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGlobalAddColumn()}
                disabled={isSubmitting || !newColumnTitle.trim()}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create Column
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal — portalled to document.body */}
      {isSharing && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6"
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsSharing(false);
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
                <Share2 className="w-4 h-4 text-zinc-500" />
                <h2>Share Project</h2>
              </div>
              <button
                onClick={() => setIsSharing(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite Section */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                  placeholder="Invite by username..."
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</span>
                      </div>
                      <button
                        onClick={() => addProjectMember(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Current Members</h3>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                {projectMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                        {member.profile?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {member.profile?.username}
                        </span>
                        <span className="text-[10px] text-zinc-500 capitalize">{member.role}</span>
                      </div>
                    </div>
                    {member.user_id !== currentUserId && member.role !== 'owner' && (
                      <Tooltip text="Remove member">
                        <button
                          onClick={() => removeProjectMember(member.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                ))}
                {projectMembers.length === 0 && (
                  <p className="text-xs text-zinc-500 italic p-2 text-center">No other members yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
