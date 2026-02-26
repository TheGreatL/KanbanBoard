import { useState, useEffect, useMemo } from "react";
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
  ClientRect,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { useGesture } from "@use-gesture/react";
import { useSpring, animated } from "@react-spring/web";
import { useRef } from "react";
import Column, { ColumnType } from "./Column";
import TaskCard, { Task } from "./TaskCard";
import { supabase } from "@/lib/supabase";
import { Plus, Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
}

const PAN_EDGE_ZONE = 50; // pixels from edge to trigger pan
const PAN_SPEED = 5; // pixels per frame

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Canvas Transform State
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentPos = useRef({ x: 0, y: 0 });

  const [style, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
  }), []);

  const getBoundedPosition = (nextX: number, nextY: number, currentScale?: number) => {
    if (!containerRef.current || !contentRef.current) return { x: nextX, y: nextY };
    
    const container = containerRef.current.getBoundingClientRect();
    const contentW = contentRef.current.scrollWidth;
    const contentH = contentRef.current.scrollHeight;
    
    const scale = currentScale ?? style.scale.get();
    const containerW = container.width / scale;
    const containerH = container.height / scale;
    
    const paddingX = Math.max(0, containerW * 0.5);
    const paddingY = Math.max(0, containerH * 0.5);
    
    const minX = -Math.max(0, contentW - containerW) - paddingX;
    const maxX = paddingX;
    
    const minY = -Math.max(0, contentH - containerH) - paddingY;
    const maxY = paddingY;
    
    return {
      x: Math.min(Math.max(nextX, minX), maxX),
      y: Math.min(Math.max(nextY, minY), maxY)
    };
  };

  // Bind Figma-like gestures (Pan on Wheel, Zoom on Pinch/Ctrl+Wheel, Pan on Space+Drag)
  const isSpaceDown = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger canvas panning if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        isSpaceDown.current = true;
        document.body.style.cursor = "grab";
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDown.current = false;
        document.body.style.cursor = "default";
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        if (isSpaceDown.current) {
          const nextX = currentPos.current.x + dx;
          const nextY = currentPos.current.y + dy;
          const bounded = getBoundedPosition(nextX, nextY);
          currentPos.current = bounded;
          api.start({ x: bounded.x, y: bounded.y });
        }
      },
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        event.preventDefault();
        
        if (ctrlKey || event.metaKey) {
            return;
        } else {
            // Panning
            const nextX = currentPos.current.x - dx;
            const nextY = currentPos.current.y - dy;
            const bounded = getBoundedPosition(nextX, nextY);
            currentPos.current = bounded;
            api.start({ x: bounded.x, y: bounded.y });
        }
      },
      onPinch: ({ offset: [s], event }) => {
        event.preventDefault();
        
        // Dampen the zoom speed heavily for trackpads
        const currentScale = style.scale.get();
        const dampening = 0.05; 
        const delta = (s - currentScale) * dampening;
        
        const clampedScale = Math.max(0.1, Math.min(currentScale + delta, 2)); // Limit zoom between 10% and 200%
        
        const bounded = getBoundedPosition(currentPos.current.x, currentPos.current.y, clampedScale);
        currentPos.current = bounded;
        api.start({ scale: clampedScale, x: bounded.x, y: bounded.y });
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: {
         filterTaps: true,
      },
      wheel: {
      },
      pinch: {
          from: () => [style.scale.get(), 0],
          scaleBounds: { min: 0.1, max: 2 },
      }
    }
  );

  // Prevent native browser scrolling to focused elements which causes camera jumps
  useEffect(() => {
    const preventNativeScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const el = target === document ? document.documentElement : (target as HTMLElement);
      
      // Ignore inner scrolling elements like textareas
      if (el.tagName === 'TEXTAREA') return;
      
      // Reset scroll on all layout containers if they attempt to natively scroll
      if (
        el === document.documentElement ||
        el === document.body ||
        el.tagName === 'MAIN' ||
        el.id === 'kanban-container' ||
        el.classList?.contains('flex-1')
      ) {
        if (el.scrollTop !== 0) el.scrollTop = 0;
        if (el.scrollLeft !== 0) el.scrollLeft = 0;
      }
    };

    window.addEventListener('scroll', preventNativeScroll, true);
    return () => window.removeEventListener('scroll', preventNativeScroll, true);
  }, []);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: cols } = await supabase
        .from("columns")
        .select("*")
        .eq("project_id", projectId)
        .order("position");
      
      if (cols) setColumns(cols);

      if (cols && cols.length > 0) {
        const colIds = cols.map((c: { id: string }) => c.id);
        const { data: tsks } = await supabase
          .from("tasks")
          .select("*")
          .in("column_id", colIds)
          .order("position");
        if (tsks) setTasks(tsks);
      } else {
        setTasks([]);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [projectId]);

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const handleZoomIn = () => {
    const currentScale = style.scale.get();
    const clampedScale = Math.min(currentScale + 0.2, 2);
    const bounded = getBoundedPosition(currentPos.current.x, currentPos.current.y, clampedScale);
    currentPos.current = bounded;
    api.start({ scale: clampedScale, x: bounded.x, y: bounded.y });
  };

  const handleZoomOut = () => {
    const currentScale = style.scale.get();
    const clampedScale = Math.max(currentScale - 0.2, 0.1);
    const bounded = getBoundedPosition(currentPos.current.x, currentPos.current.y, clampedScale);
    currentPos.current = bounded;
    api.start({ scale: clampedScale, x: bounded.x, y: bounded.y });
  };

  const handleResetView = () => {
    currentPos.current = { x: 0, y: 0 };
    api.start({ x: 0, y: 0, scale: 1 });
  };

  const addTask = async (columnId: string, title: string, content: string) => {
    const colTasks = tasks.filter((t) => t.column_id === columnId);
    const newPos = colTasks.length > 0 ? colTasks[colTasks.length - 1].position + 1 : 0;
    
    // Optimistic update
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

  const updateTask = async (id: string, title: string, content: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title, content } : t)));
    await supabase.from("tasks").update({ title, content }).eq("id", id);
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const addColumn = async () => {
    const title = `Column ${columns.length + 1}`;
    const colors = ["zinc", "blue", "rose", "emerald", "amber", "indigo", "violet", "cyan", "teal", "fuchsia", "orange"];
    const color = colors[columns.length % colors.length];
    const newPos = columns.length > 0 ? columns[columns.length - 1].position + 1 : 0;

    const { data } = await supabase
      .from("columns")
      .insert({ project_id: projectId, title, color, position: newPos })
      .select()
      .single();

    if (data) setColumns((prev) => [...prev, data]);
  };

  const deleteColumn = async (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.column_id !== id));
    await supabase.from("columns").delete().eq("id", id);
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

  // Custom collision detection to handle scaled/translated canvas
  const customCollisionDetection: CollisionDetection = (args) => {
    // Standard intersections first (useful for finding the primary target)
    const cornersIntersections = closestCorners(args);
    
    // If we're not scaling or panning much, let the default handle it
    if (Math.abs(style.scale.get() - 1) < 0.05 && Math.abs(style.x.get()) < 10 && Math.abs(style.y.get()) < 10) {
        return cornersIntersections;
    }

    if (!args.active || !args.collisionRect) return cornersIntersections;

    const scale = style.scale.get();
    const panX = style.x.get();
    const panY = style.y.get();

    // The collision rect from dnd-kit is in screen coordinates.
    // We need to map it back to canvas coordinates to find true intersections.
    const activeRect = {
      top: (args.collisionRect.top - panY) / scale,
      left: (args.collisionRect.left - panX) / scale,
      bottom: (args.collisionRect.bottom - panY) / scale,
      right: (args.collisionRect.right - panX) / scale,
      width: args.collisionRect.width / scale,
      height: args.collisionRect.height / scale,
    };

    let closestId: string | number | null = null;
    let minDistance = Infinity;

    // Manually check distance to all droppable rects in the transformed space
    for (const droppableContainer of args.droppableContainers) {
      const { id, rect } = droppableContainer;
      if (!rect.current) continue;

      const dropRect = {
        top: (rect.current.top - panY) / scale,
        left: (rect.current.left - panX) / scale,
        bottom: (rect.current.bottom - panY) / scale,
        right: (rect.current.right - panX) / scale,
      };

      // Calculate distance between centers
      const activeCenterX = activeRect.left + activeRect.width / 2;
      const activeCenterY = activeRect.top + activeRect.height / 2;
      
      const dropCenterX = dropRect.left + (dropRect.right - dropRect.left) / 2;
      const dropCenterY = dropRect.top + (dropRect.bottom - dropRect.top) / 2;

      const distance = Math.sqrt(
        Math.pow(activeCenterX - dropCenterX, 2) + Math.pow(activeCenterY - dropCenterY, 2)
      );

      // Add a strong bias towards tasks over columns if dragging a task
      const isTaskContainer = String(id).includes('-'); // Heuristic: task IDs usually have hyphens, column IDs might too but we can check data
      const bias = isTaskContainer ? 1 : 1.5;

      if (distance * bias < minDistance) {
        minDistance = distance * bias;
        closestId = id;
      }
    }

    if (closestId) {
      return [{ id: closestId, data: { droppableContainer: args.droppableContainers.find(c => c.id === closestId) } }];
    }

    return cornersIntersections;
  };

  // Auto-pan logic during dragging
  const isDraggingItem = useRef(false);
  const pointerPos = useRef({ x: 0, y: 0 });
  const rAF = useRef<number | null>(null);

  const autoPanLoop = () => {
    if (!isDraggingItem.current) {
      if (rAF.current) cancelAnimationFrame(rAF.current);
      return;
    }

    const { innerWidth, innerHeight } = window;
    const { x, y } = pointerPos.current;
    
    let dx = 0;
    let dy = 0;

    if (x < PAN_EDGE_ZONE) dx = PAN_SPEED; // Pan left (move canvas right)
    else if (x > innerWidth - PAN_EDGE_ZONE) dx = -PAN_SPEED; // Pan right
    
    if (y < PAN_EDGE_ZONE) dy = PAN_SPEED; // Pan up
    else if (y > innerHeight - PAN_EDGE_ZONE) dy = -PAN_SPEED; // Pan down

    if (dx !== 0 || dy !== 0) {
      const nextX = currentPos.current.x + dx;
      const nextY = currentPos.current.y + dy;
      const bounded = getBoundedPosition(nextX, nextY);
      currentPos.current = bounded;
      api.set({ x: bounded.x, y: bounded.y }); // Use api.set for zero-latency frame updates
    }

    rAF.current = requestAnimationFrame(autoPanLoop);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      pointerPos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  function onDragStart(event: DragStartEvent) {
    isDraggingItem.current = true;
    if (!rAF.current) rAF.current = requestAnimationFrame(autoPanLoop);

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

    // Dropping a Task over another Task
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

    // Dropping a Task over an empty Column
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
    isDraggingItem.current = false;
    if (rAF.current) {
      cancelAnimationFrame(rAF.current);
      rAF.current = null;
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
      const overColIndex = columns.findIndex((col) => col.id === overId);
      
      const newColumns = arrayMove(columns, activeColIndex, overColIndex);
      
      // Update local state and DB positions
      setColumns(newColumns.map((col, idx) => ({ ...col, position: idx })));
      for (const [idx, col] of newColumns.entries()) {
        supabase.from("columns").update({ position: idx }).eq("id", col.id).then();
      }
      return;
    }

    const isActiveTask = active.data.current?.type === "Task";
    if (isActiveTask) {
      const activeObj = tasks.find((t) => t.id === activeId);
      if (!activeObj) return;

      const colTasks = tasks.filter((t) => t.column_id === activeObj.column_id);
      
      // Update local and remote DB task positions and column_ids
      for (const [idx, tsk] of colTasks.entries()) {
        if (tsk.id === activeId) {
          supabase.from("tasks").update({ column_id: activeObj.column_id, position: idx }).eq("id", activeId).then();
        } else if (tsk.position !== idx) {
          supabase.from("tasks").update({ position: idx }).eq("id", tsk.id).then();
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      id="kanban-container"
      className="flex flex-col h-full w-full min-w-0 overflow-hidden touch-none relative"
      style={{ touchAction: 'none' }} // Prevent browser interference with pinch/pan
      onScroll={(e) => {
        // Prevent native browser focus from shifting the strictly bounded layout
        e.currentTarget.scrollTop = 0;
        e.currentTarget.scrollLeft = 0;
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        autoScroll={false}
      >
        <animated.div 
            ref={contentRef}
            style={{ 
                x: style.x, 
                y: style.y, 
                scale: style.scale, 
                transformOrigin: '0 0' 
            }}
            className="flex gap-6 items-start pr-8 pb-8 origin-top-left w-max h-max min-w-full min-h-full"
        >
          <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={tasks.filter((t) => t.column_id === col.id)}
                deleteColumn={deleteColumn}
                deleteTask={deleteTask}
                addTask={addTask}
                updateTask={updateTask}
                updateColumnColor={updateColumnColor}
                updateColumnTitle={updateColumnTitle}
              />
            ))}
          </SortableContext>

          <button
            onClick={addColumn}
            className="w-80 shrink-0 h-[60px] flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium text-sm">Add another column</span>
          </button>
        </animated.div>

        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay>
              {activeColumn && (
                <Column
                  column={activeColumn}
                  tasks={tasks.filter((t) => t.column_id === activeColumn.id)}
                  deleteColumn={deleteColumn}
                  deleteTask={deleteTask}
                  addTask={addTask}
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

      {/* Navigation Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm select-none z-50">
        <button
          onClick={handleZoomOut}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <button
          onClick={handleResetView}
          className="px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors flex items-center justify-center min-w-[70px]"
          title="Reset View"
        >
          <animated.span className="text-xs font-semibold tabular-nums">
            {style.scale.to((s) => `${Math.round(s * 100)}%`)}
          </animated.span>
        </button>
      </div>
    </div>
  );
}
