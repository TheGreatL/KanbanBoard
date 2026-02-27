import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Pencil, X, Check, Calendar, GripVertical, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "./ui/Tooltip";

export interface Task {
  id: string;
  column_id: string;
  project_id: string;
  title: string;
  content: string;
  position: number;
  created_at?: string;
  archived_at?: string | null;
  previous_column_id?: string | null;
}

interface TaskCardProps {
  task: Task;
  columnColor?: string;
  deleteTask: (id: string) => void;
  updateTask?: (id: string, title: string, content: string) => Promise<void>;
  restoreTask?: (id: string, targetColumnId: string) => Promise<void>;
  isOverlay?: boolean;
}

const STRIP_COLOR_MAP: Record<string, string> = {
  zinc: "bg-zinc-400 dark:bg-zinc-500",
  blue: "bg-blue-400 dark:bg-blue-500",
  rose: "bg-rose-400 dark:bg-rose-500",
  emerald: "bg-emerald-400 dark:bg-emerald-500",
  amber: "bg-amber-400 dark:bg-amber-500",
  indigo: "bg-indigo-400 dark:bg-indigo-500",
  violet: "bg-violet-400 dark:bg-violet-500",
  cyan: "bg-cyan-400 dark:bg-cyan-500",
  teal: "bg-teal-400 dark:bg-teal-500",
  fuchsia: "bg-fuchsia-400 dark:bg-fuchsia-500",
  orange: "bg-orange-400 dark:bg-orange-500",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskCard({ task, columnColor = "zinc", deleteTask, updateTask, restoreTask, isOverlay }: TaskCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task },
    disabled: isOverlay,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title ?? "");
  const [editContent, setEditContent] = useState(task.content ?? "");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isArchived = !!task.archived_at;
  const accentColorClass = STRIP_COLOR_MAP[columnColor] || STRIP_COLOR_MAP.zinc;

  // Sync edit fields if task changes externally
  useEffect(() => {
    setEditTitle(prev => prev !== task.title ? (task.title ?? "") : prev);
    setEditContent(prev => prev !== task.content ? (task.content ?? "") : prev);
  }, [task.title, task.content]);

  // Auto-focus without triggering scroll-into-view
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus({ preventScroll: true });
    }
  }, [isEditing]);

  // Close modal on outside click
  useEffect(() => {
    if (!isEditing) return;
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setEditTitle(task.title ?? "");
        setEditContent(task.content ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, task.title, task.content]);

  const handleEditSave = async () => {
    const trimTitle = editTitle.trim();
    const trimContent = editContent.trim();
    if (!trimTitle && !trimContent) return;
    if (updateTask) {
      await updateTask(task.id, trimTitle, trimContent);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(task.title ?? "");
      setEditContent(task.content ?? "");
    }
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-dashed border-zinc-400 dark:border-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 min-h-[80px]"
      />
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="no-pan group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-xl hover:shadow-zinc-200/30 dark:hover:shadow-black/50 transition-all text-sm text-zinc-800 dark:text-zinc-200 flex items-stretch cursor-default relative overflow-hidden active:scale-[0.99]"
        tabIndex={undefined}
      >
        {/* Semantic Left Strip */}
        <div className={`w-1 shrink-0 ${accentColorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />

        {/* Drag handle — overlays content slightly or sits on left */}
        <Tooltip text="Drag to move" position="right">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center px-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </Tooltip>

        {/* Card content */}
        <div className="flex flex-col gap-1.5 p-3 pl-1 flex-1 min-w-0">
          {task.title && (
            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words tracking-tight">
              {task.title}
            </p>
          )}
          {task.content && (
            <p className="whitespace-pre-wrap text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed break-words font-medium opacity-80 group-hover:opacity-100 transition-opacity">
              {task.content}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-1">
            {task.created_at ? (
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold select-none">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(task.created_at)}
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1 lg:invisible lg:opacity-0 lg:group-hover:visible lg:group-hover:opacity-100 transition-all translate-x-0 lg:translate-x-1 lg:group-hover:translate-x-0">
              {restoreTask && (
                  <Tooltip text="Restore task">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRestoreDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                      className="p-1.5 px-2 text-zinc-400 hover:text-emerald-500 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
              )}
              <Tooltip text="Edit task">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTitle(task.title ?? "");
                    setEditContent(task.content ?? "");
                    setIsEditing(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-1 px-1.5 text-zinc-400 hover:text-blue-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip text={isArchived ? "Delete permanently" : "Archive task"}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-1.5 px-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal — portalled to document.body */}
      {isEditing && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6"
            onKeyDown={handleEditKeyDown}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-zinc-400" />
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Edit Task</h2>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(task.title ?? "");
                  setEditContent(task.content ?? "");
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Task title…"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Add a description…"
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(task.title ?? "");
                  setEditContent(task.content ?? "");
                }}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex items-center gap-1.5 px-6 py-2 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Restore Task Modal */}
      {isRestoreDialogOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[202] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsRestoreDialogOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Restore Task</h2>
              </div>
              <button
                onClick={() => setIsRestoreDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Restore <span className="font-bold text-zinc-900 dark:text-zinc-100">"{task.title}"</span> to its original column?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRestoreDialogOpen(false)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (restoreTask) {
                    await restoreTask(task.id, "");
                    setIsRestoreDialogOpen(false);
                  }
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs text-white font-bold bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Restore Task
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal — Context Aware (Archive vs Permanent Delete) */}
      {isDeleteDialogOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6"
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsDeleteDialogOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isArchived ? (
                  <Trash2 className="w-4 h-4 text-red-500" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                )}
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  {isArchived ? "Delete Permanently" : "Archive Task"}
                </h2>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              {isArchived ? (
                <>Are you sure you want to permanently delete <span className="font-bold text-zinc-900 dark:text-zinc-100">"{task.title}"</span>? This action cannot be undone.</>
              ) : (
                <>Move <span className="font-bold text-zinc-900 dark:text-zinc-100">"{task.title}"</span> to the archive? You can restore it anytime from the archive pool.</>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteTask(task.id);
                  setIsDeleteDialogOpen(false);
                }}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs text-white font-bold rounded-lg transition-colors cursor-pointer ${
                  isArchived 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {isArchived ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {isArchived ? "Delete Permanently" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
