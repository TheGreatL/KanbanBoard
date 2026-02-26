import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, X, GripVertical, LayoutList, AlignLeft, Check, Archive, ChevronRight } from "lucide-react";
import TaskCard, { Task } from "./TaskCard";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Tooltip } from "./ui/Tooltip";

export interface ColumnType {
  id: string;
  project_id: string;
  title: string;
  color: string;
  position: number;
  created_at: string;
  archived_at?: string | null;
  is_archive_pool?: boolean;
}

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  archiveColumn: (id: string) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string, targetColumnId: string) => Promise<void>;
  addTask: (columnId: string, title: string, content: string) => Promise<void>;
  onAddTaskClick?: () => void;
  updateTask?: (id: string, title: string, content: string) => Promise<void>;
  updateColumnColor?: (columnId: string, color: string) => Promise<void>;
  updateColumnTitle?: (columnId: string, title: string) => Promise<void>;
  isOverlay?: boolean;
  remoteDragging?: { taskId: string; columnId: string; username: string }[];
}

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

const BORDER_COLOR_MAP: Record<string, string> = {
  zinc: "border-t-zinc-400 dark:border-t-zinc-500",
  blue: "border-t-blue-400 dark:border-t-blue-500",
  rose: "border-t-rose-400 dark:border-t-rose-500",
  emerald: "border-t-emerald-400 dark:border-t-emerald-500",
  amber: "border-t-amber-400 dark:border-t-amber-500",
  indigo: "border-t-indigo-400 dark:border-t-indigo-500",
  violet: "border-t-violet-400 dark:border-t-violet-500",
  cyan: "border-t-cyan-400 dark:border-t-cyan-500",
  teal: "border-t-teal-400 dark:border-t-teal-500",
  fuchsia: "border-t-fuchsia-400 dark:border-t-fuchsia-500",
  orange: "border-t-orange-400 dark:border-t-orange-500",
};

const BG_COLOR_MAP: Record<string, string> = {
  zinc: "bg-zinc-100/70 dark:bg-zinc-900/40",
  blue: "bg-blue-100/60 dark:bg-blue-900/20",
  rose: "bg-rose-100/60 dark:bg-rose-900/20",
  emerald: "bg-emerald-100/60 dark:bg-emerald-900/20",
  amber: "bg-amber-100/60 dark:bg-amber-900/20",
  indigo: "bg-indigo-100/60 dark:bg-indigo-900/20",
  violet: "bg-violet-100/60 dark:bg-violet-900/20",
  cyan: "bg-cyan-100/60 dark:bg-cyan-900/20",
  teal: "bg-teal-100/60 dark:bg-teal-900/20",
  fuchsia: "bg-fuchsia-100/60 dark:bg-fuchsia-900/20",
  orange: "bg-orange-100/60 dark:bg-orange-900/20",
};

const BADGE_COLOR_MAP: Record<string, string> = {
  zinc: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
  blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  rose: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  indigo: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  cyan: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  teal: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  fuchsia: "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300",
  orange: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
};

export default function Column({
  column,
  tasks,
  archiveColumn,
  deleteTask,
  restoreTask,
  addTask,
  onAddTaskClick,
  updateTask,
  updateColumnColor,
  updateColumnTitle,
  isOverlay,
  remoteDragging = [],
}: ColumnProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "Column", column },
    disabled: isOverlay,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    }
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker]);

  const handleColorSelect = async (color: string) => {
    setShowColorPicker(false);
    if (updateColumnColor && color !== column.color) {
      await updateColumnColor(column.id, color);
    }
  };

  const handleTitleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle || trimmedTitle === column.title) {
      setEditTitle(column.title);
      setIsEditingTitle(false);
      return;
    }
    if (updateColumnTitle) {
      await updateColumnTitle(column.id, trimmedTitle);
    }
    setIsEditingTitle(false);
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-dashed border-zinc-400 dark:border-zinc-500 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10 w-80 shrink-0 flex flex-col min-h-[500px]"
      />
    );
  }

  const dotColorClass = DOT_COLOR_MAP[column.color] || "bg-zinc-400";
  const borderColorClass = BORDER_COLOR_MAP[column.color] || "border-t-zinc-400";
  const bgColorClass = BG_COLOR_MAP[column.color] || "bg-zinc-50/80";
  const badgeColorClass = BADGE_COLOR_MAP[column.color] || "bg-zinc-200 text-zinc-700";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${bgColorClass} w-80 shrink-0 flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 border-t-4 ${borderColorClass} transition-colors duration-300 h-max ${column.is_archive_pool ? 'opacity-90 grayscale-[0.2]' : ''}`}
      >
        {/* Column Header */}
        <div className="no-pan p-4 flex items-center gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 relative group/header">
          {/* Drag handle */}
          {!column.is_archive_pool && (
            <Tooltip text="Drag to reorder column">
              <div
                {...attributes}
                {...listeners}
                className="text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0 flex items-center transition-colors"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            </Tooltip>
          )}

          {/* Color dot + picker */}
          <div className="relative shrink-0" ref={colorPickerRef} onPointerDown={(e) => e.stopPropagation()}>
            <Tooltip text="Change column color">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowColorPicker((prev) => !prev);
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                className="p-1 -ml-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer flex items-center justify-center opacity-80 hover:opacity-100 outline-none"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
              </button>
            </Tooltip>

            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 grid grid-cols-4 gap-2 cursor-auto w-28"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {AVAILABLE_COLORS.map((color) => (
                    <Tooltip key={color} text={color}>
                      <button
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleColorSelect(color);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-4 h-4 rounded-full ${DOT_COLOR_MAP[color]} hover:scale-110 transition-transform ${column.color === color ? 'ring-2 ring-offset-1 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950' : ''}`}
                      />
                    </Tooltip>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle && !column.is_archive_pool ? (
              <form onSubmit={handleTitleSubmit} className="flex-1 min-w-0">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleTitleSubmit()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      setEditTitle(column.title);
                      setIsEditingTitle(false);
                    }
                  }}
                />
              </form>
            ) : (
              <Tooltip text={column.is_archive_pool ? "" : "Click to edit name"} disabled={column.is_archive_pool}>
                <h3
                  className={cn(
                    "font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate rounded px-1.5 py-0.5 -ml-1.5 transition-colors",
                    !column.is_archive_pool && "cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  )}
                  onClick={(e) => {
                    if (column.is_archive_pool) return;
                    e.stopPropagation();
                    setIsEditingTitle(true);
                    setEditTitle(column.title);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {column.title}
                </h3>
              </Tooltip>
            )}
          </div>

          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-colors duration-300 ${badgeColorClass}`}>
            {tasks.length}
          </span>

          {!column.is_archive_pool && (
              <Tooltip text="Archive column">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  className="shrink-0 opacity-0 group-hover/header:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
          )}
        </div>

        {/* Task List */}
        <div className="no-pan p-3 flex flex-col gap-3">
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                columnColor={column.color}
                deleteTask={deleteTask}
                updateTask={updateTask}
                restoreTask={column.is_archive_pool ? restoreTask : undefined}
              />
            ))}
          </SortableContext>

          {/* Remote Dragging Indicators (Ghost Cards) */}
          {remoteDragging.map((dragging, idx) => (
            <div
              key={`dragging-${idx}`}
              className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl animate-pulse flex items-center gap-2 mt-2"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium italic truncate">
                {dragging.username} is moving a task here...
              </span>
            </div>
          ))}

          {tasks.length === 0 && remoteDragging.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-400 dark:text-zinc-600 gap-1.5">
              <LayoutList className="w-5 h-5 opacity-50" />
              <p className="text-xs">No tasks yet</p>
            </div>
          )}

          {/* Add Task Button */}
          {!column.is_archive_pool && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAddTaskClick) onAddTaskClick();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center gap-2 w-full p-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer group/add"
            >
              <div className="w-5 h-5 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70 flex items-center justify-center group-hover/add:bg-zinc-300/70 dark:group-hover/add:bg-zinc-700/70 transition-colors">
                <Plus className="w-3 h-3" />
              </div>
              <span className="font-medium">Add task</span>
            </button>
          )}
        </div>
      </div>

      {/* Archive Column Modal — portalled to document.body */}
      {isDeleteDialogOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsDeleteDialogOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Archive Column</h2>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to archive <span className="font-medium text-zinc-900 dark:text-zinc-100">&ldquo;{column.title}&rdquo;</span>? You can restore it later if needed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  archiveColumn(column.id);
                  setIsDeleteDialogOpen(false);
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Archive
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
