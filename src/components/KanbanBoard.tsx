import { useState, useEffect, useMemo, useRef } from "react";
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
import { Plus, Loader2, ZoomIn, ZoomOut, LayoutList, AlignLeft, X, Check, Columns, Maximize } from "lucide-react";
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
      <button
        onClick={() => zoomOut(0.2)}
        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <button
        onClick={() => zoomIn(0.2)}
        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
      <button
        onClick={() => resetTransform()}
        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
        title="Reset Camera"
      >
        <Maximize className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
      <div
        className="px-3 py-2 text-zinc-500 flex items-center justify-center min-w-[60px]"
        title="Current Zoom"
      >
        <span className="text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-600">{displayScale}%</span>
      </div>
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
  }, [projectId]);

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const addTask = async (columnId: string, title: string, content: string) => {
    const colTasks = tasks.filter((t) => t.column_id === columnId);
    const newPos = colTasks.length > 0 ? colTasks[colTasks.length - 1].position + 1 : 0;

    const tempId = `temp-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newTask: Task = { id: tempId, column_id: columnId, title, content, position: newPos, created_at: nowStr };
    setTasks((prev) => [...prev, newTask]);

    const { data } = await supabase
      .from("tasks")
      .insert({ column_id: columnId, title, content, position: newPos })
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

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].column_id !== tasks[overIndex].column_id) {
          const newTasks = [...tasks];
          newTasks[activeIndex].column_id = tasks[overIndex].column_id;
          return arrayMove(newTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].column_id = overId.toString();
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  }

  async function onDragEnd(event: DragEndEvent) {
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
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      className={`w-full aspect-square rounded-full ${DOT_COLOR_MAP[color]} hover:scale-110 transition-transform flex items-center justify-center cursor-pointer ${newColumnColor === color ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950 shadow-sm' : ''}`}
                      title={color}
                    >
                      {newColumnColor === color && <Check className="w-3 h-3 text-white" />}
                    </button>
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
    </div>
  );
}
