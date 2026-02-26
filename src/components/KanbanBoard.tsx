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
  MeasuringStrategy,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from "react-zoom-pan-pinch";
import Column, { ColumnType } from "./Column";
import TaskCard, { Task } from "./TaskCard";
import { supabase } from "@/lib/supabase";
import { Tooltip } from "./ui/Tooltip";
import { useToast } from "./ui/Toast";
import { Columns, Loader2, Maximize, Plus, Share2, Users, ZoomIn, ZoomOut } from "lucide-react";
import ShareModal from "./modals/ShareModal";
import AddTaskModal from "./modals/AddTaskModal";
import AddColumnModal from "./modals/AddColumnModal";
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
  const { showToast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState("");
  
  const columnsRef = useRef<ColumnType[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const initialColumnIdRef = useRef<string | null>(null);

  // Custom setters that also update the sync refs immediately
  const updateColumns = useCallback((updater: ColumnType[] | ((prev: ColumnType[]) => ColumnType[])) => {
    setColumns((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      columnsRef.current = next;
      return next;
    });
  }, []);

  const sortTasks = (tsks: Task[]) => {
    return [...tsks].sort((a, b) => {
      if (a.column_id !== b.column_id) return a.column_id.localeCompare(b.column_id);
      return (a.position - b.position) || (a.id.localeCompare(b.id));
    });
  };

  const updateTasks = useCallback((updater: Task[] | ((prev: Task[]) => Task[]), shouldSort = false) => {
    setTasks((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const result = shouldSort ? sortTasks(next) : next;
      tasksRef.current = result;
      return result;
    });
  }, []);

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
  const fetchBoardData = useCallback(async () => {
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

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

    // Sort columns: regular columns stay in order, archived pool always goes last
    const sortedCols = [...finalCols].sort((a, b) => {
      if (a.is_archive_pool) return 1;
      if (b.is_archive_pool) return -1;
      return a.position - b.position;
    });

    updateColumns(sortedCols);
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
            updateColumns((prev) => {
              if (prev.some((c) => c.id === newCol.id)) return prev;
              if (newCol.is_archive_pool && prev.some(c => c.is_archive_pool)) return prev;
              return [...prev, newCol];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedCol = payload.new as ColumnType;
            if (updatedCol.archived_at && !updatedCol.is_archive_pool) {
              updateColumns((prev) => prev.filter((c) => c.id !== updatedCol.id));
            } else {
              updateColumns((prev) =>
                prev.map((c) => (c.id === updatedCol.id ? updatedCol : c))
              );
            }
          } else if (payload.eventType === "DELETE") {
            updateColumns((prev) => prev.filter((c) => c.id !== payload.old.id));
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
            updateTasks((prev) => {
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            }, true);
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task;
            updateTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
              true
            );
          } else if (payload.eventType === "DELETE") {
            updateTasks((prev) => prev.filter((t) => t.id !== payload.old.id), false);
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
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
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
    updateTasks((prev) => [...prev, newTask]);
    
    // Close modal immediately for zero-latency UI
    setIsAddingTask(false);

    const { data } = await supabase
      .from("tasks")
      .insert({ column_id: columnId, project_id: projectId, title, content, position: newPos })
      .select()
      .single();

    if (data) {
      updateTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)));
    }
  };

  // Modal Open Handlers
  const openShareModal = () => setIsSharing(true);
  const openAddTaskModal = (columnId?: string) => {
    if (columnId) setSelectedColumnId(columnId);
    setIsAddingTask(true);
  };
  const openAddColumnModal = () => setIsAddingColumn(true);

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const column = columns.find(c => c.id === task.column_id);
    const archivePool = columns.find(c => c.is_archive_pool);

    if (column?.is_archive_pool) {
      // Hard delete if already in archive
      updateTasks((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
    } else if (archivePool) {
      // Soft delete: move to archive pool, set archived_at, and remember current column
      const now = new Date().toISOString();
      const currentColumnId = task.column_id;
      const updatedTask = { ...task, column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 0 };
      updateTasks((prev) => [updatedTask, ...prev.filter((t) => t.id !== id)]);
      await supabase.from("tasks").update({ column_id: archivePool.id, archived_at: now, previous_column_id: currentColumnId, position: 0 }).eq("id", id);
      
      showToast({
        type: "info",
        title: "Task Archived",
        message: `"${task.title}" moved to Archive.`,
        action: {
          label: "Undo",
          onClick: () => restoreTask(id),
        },
      });
    } else {
      // Fallback to hard delete if no archive pool (though we ensure it exists)
      updateTasks((prev) => prev.filter((t) => t.id !== id));
      await supabase.from("tasks").delete().eq("id", id);
      showToast({ 
        type: "info", 
        title: "Task Deleted", 
        message: `"${task.title}" has been permanently removed.` 
      });
    }
  };

  const archiveColumn = async (id: string) => {
    const column = columns.find(c => c.id === id);
    if (!column || column.is_archive_pool) return;

    const now = new Date().toISOString();
    updateColumns((prev) => prev.filter((c) => c.id !== id));
    // Tasks in this column are NOT automatically archived, they just become inaccessible via this board
    // until we decide if we want to move them. Common pattern is to let them be.
    if (selectedColumnId === id) setSelectedColumnId("");
    await supabase.from("columns").update({ archived_at: now }).eq("id", id);
      showToast({
        type: "info",
        title: "Column Archived",
        message: `"${column.title}" has been moved to Archive.`,
        action: {
          label: "Undo",
          onClick: async () => {
            updateColumns((prev) => [...prev, column]);
            const { error } = await supabase.from("columns").update({ archived_at: null }).eq("id", id);
            if (!error) {
              showToast({
                type: "success",
                title: "Column Restored",
                message: `"${column.title}" is back on the board.`
              });
            }
          }
        },
      });
  };

  const updateColumnColor = async (id: string, color: string) => {
    updateColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    const { error } = await supabase.from("columns").update({ color }).eq("id", id);
    if (!error) {
      showToast({
        type: "success",
        title: "Color Updated",
        message: "Column color saved successfully."
      });
    }
  };

  const updateColumnTitle = async (id: string, title: string) => {
    updateColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    const { error } = await supabase.from("columns").update({ title }).eq("id", id);
    if (!error) {
      showToast({
        type: "success",
        title: "Column Renamed",
        message: `Column renamed to "${title}".`
      });
    }
  };

  const updateTask = async (id: string, title: string, content: string) => {
    updateTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title, content } : t)));
    const { error } = await supabase.from("tasks").update({ title, content }).eq("id", id);
    if (!error) {
      showToast({ 
        type: "success", 
        title: "Task Updated", 
        message: `Changes to "${title}" have been saved.` 
      });
    } else {
      showToast({ 
        type: "error", 
        title: "Update Failed", 
        message: `Could not save changes to "${title}".` 
      });
    }
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

    updateTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column_id: finalTargetId, archived_at: null, previous_column_id: null, position: 0 } : t)));
    const { error } = await supabase.from("tasks").update({ column_id: finalTargetId, archived_at: null, previous_column_id: null, position: 0 }).eq("id", id);
    if (!error) {
      showToast({ 
        type: "success", 
        title: "Task Restored", 
        message: `"${task.title}" is back in its original place.` 
      });
    }
  };

  const addColumn = async (title: string, color: string) => {
    const archivePool = columns.find(c => c.is_archive_pool);
    const regularCols = columns.filter(c => !c.is_archive_pool);
    const newPos = regularCols.length;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const tempColumn: ColumnType = {
      id: tempId,
      project_id: projectId,
      title,
      color: color as any,
      position: newPos,
      created_at: new Date().toISOString(),
      archived_at: null,
      is_archive_pool: false
    };

    if (archivePool) {
      updateColumns([...regularCols, tempColumn, { ...archivePool, position: newPos + 1 }]);
    } else {
      updateColumns([...regularCols, tempColumn]);
    }
    
    setIsAddingColumn(false);

    const { data } = await supabase
      .from("columns")
      .insert({ project_id: projectId, title, color, position: newPos })
      .select()
      .single();

    if (data) {
      updateColumns((prev) => prev.map((c) => (c.id === tempId ? data : c)));
      
      if (archivePool) {
        await supabase.from("columns").update({ position: newPos + 1 }).eq("id", archivePool.id);
      }
      
      if (!selectedColumnId) setSelectedColumnId(data.id);
      
      showToast({ 
        type: "success", 
        title: "Column Added", 
        message: `"${title}" column is now active.` 
      });
    }
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
      initialColumnIdRef.current = active.data.current.task.column_id;
      // Broadcast start of drag using ref
      const channel = channelRef.current;
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
    // 1. Broadcast and reset UI state immediately
    const channel = channelRef.current;
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
    const isActiveColumn = active.data.current?.type === "Column";
    if (isActiveColumn) {
      const activeColIndex = currentCols.findIndex((col) => col.id === activeId);
      const overColIndex = currentCols.findIndex((col) => col.id === overId);
      
      const newColumns = arrayMove(currentCols, activeColIndex, overColIndex);
      const finalColumns = [...newColumns].sort((a, b) => {
        if (a.is_archive_pool) return 1;
        if (b.is_archive_pool) return -1;
        return 0;
      });

      const updatedColumns = finalColumns.map((col, idx) => ({ ...col, position: idx }));
      setColumns(updatedColumns);
      
      const columnsToUpsert = updatedColumns.map((col) => ({
        id: col.id,
        project_id: projectId,
        position: col.position,
        title: col.title,
        color: col.color,
        is_archive_pool: col.is_archive_pool
      }));

      try {
        const { error } = await supabase.from("columns").upsert(columnsToUpsert);
        if (error) throw error;
        showToast({
          type: "success",
          title: "Board Updated",
          message: "Column arrangement saved."
        });
      } catch (err: any) {
        console.error("Column persistence error:", err);
        showToast({
          type: "error",
          title: "Save Failed",
          message: err.message || "Could not save column order."
        });
      }
      return;
    }

    // --- HANDLE TASK DRAG ---
    const isActiveTask = active.data.current?.type === "Task";
    if (isActiveTask) {
      const activeTaskInState = currentTasks.find(t => t.id === activeId);
      if (!activeTaskInState) return;
      
      const targetColumnId = activeTaskInState.column_id;
      const affectedColumnIds = Array.from(new Set([initialColumnId || targetColumnId, targetColumnId]));

      // Select and prepare ALL tasks in the source and destination columns
      const tasksToUpsert = currentTasks
        .filter(t => affectedColumnIds.includes(t.column_id))
        .map((t) => {
          const colTasks = currentTasks.filter(tsk => tsk.column_id === t.column_id);
          const idx = colTasks.findIndex(tsk => tsk.id === t.id);
          return {
            id: t.id,
            column_id: t.column_id,
            position: idx,
            project_id: t.project_id || projectId,
            content: t.content,
            title: t.title,
            archived_at: t.archived_at
          };
        });

      if (tasksToUpsert.length === 0) return;

      try {
        const { error } = await supabase.from("tasks").upsert(tasksToUpsert);
        if (error) throw error;

        showToast({
          type: "success",
          title: "Board Updated",
          message: initialColumnId === targetColumnId 
            ? "Task order saved." 
            : `"${activeTaskInState.title}" moved to ${currentCols.find(c => c.id === targetColumnId)?.title || "Target"}.`
        });
      } catch (err: any) {
        console.error("Task persistence error:", err);
        showToast({
          type: "error",
          title: "Sync Error",
          message: "Could not save changes. Refreshing..."
        });
        fetchBoardData(); // Force sync with server
      }
    }
  };

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
        }}
      >
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
              onClick={() => openAddTaskModal()}
              disabled={columns.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
            <button
              onClick={openAddColumnModal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Column
            </button>
            <button
              onClick={openShareModal}
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
                      openAddTaskModal(col.id);
                    }}
                    updateTask={updateTask}
                    updateColumnColor={updateColumnColor}
                    updateColumnTitle={updateColumnTitle}
                  />
                ))}
              </SortableContext>

              <button
                onClick={openAddColumnModal}
                className="no-pan w-80 shrink-0 h-[60px] flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Add another column</span>
              </button>
            </div>
          </TransformComponent>

          {/* Navigation Controls */}
          <ZoomControls />
        </TransformWrapper>

        {typeof window !== "undefined" &&
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
                  updateColumnTitle={updateColumnTitle}
                  isOverlay
                />
              )}
              {activeTask && <TaskCard task={activeTask} deleteTask={deleteTask} isOverlay />}
            </DragOverlay>,
            document.body
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
    </div>
  );
}
