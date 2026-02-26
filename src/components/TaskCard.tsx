import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Pencil, X, Check, Calendar, GripVertical, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  deleteTask: (id: string) => void;
  updateTask?: (id: string, title: string, content: string) => Promise<void>;
  restoreTask?: (id: string, targetColumnId: string) => Promise<void>;
  isOverlay?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskCard({ task, deleteTask, updateTask, restoreTask, isOverlay }: TaskCardProps) {
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
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync edit fields if task changes externally
  useEffect(() => {
    setEditTitle(task.title ?? "");
    setEditContent(task.content ?? "");
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
        className="no-pan group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all text-sm text-zinc-800 dark:text-zinc-200 flex items-stretch cursor-default"
        tabIndex={undefined}
      >
        {/* Drag handle — left strip */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-1.5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing rounded-l-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shrink-0"
          title="Drag to move"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Card content */}
        <div className="flex flex-col gap-1.5 p-3 flex-1 min-w-0">
          {task.title && (
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words">
              {task.title}
            </p>
          )}
          {task.content && (
            <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed break-words">
              {task.content}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-0.5">
            {task.created_at ? (
              <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600 select-none">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(task.created_at)}
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {restoreTask && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // We need a way to let the user pick a target column, 
                    // but for now we'll just use a simple restoration to the first active column 
                    // or let the parent handle the target selection if we had a more complex UI.
                    // For the sake of this implementation, we'll assume the parent knows where to put it
                    // or we'll prompt for column selection in a real app.
                    // Simplified: We'll just call it and let the board handle it.
                    // Actually, we'll just pass a dummy/default and let KanbanBoard handle the logic.
                    // I will update the restoreTask signature in KanbanBoard to be more flexible.
                    restoreTask(task.id, ""); 
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-1 text-zinc-400 hover:text-emerald-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Restore task"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTitle(task.title ?? "");
                  setEditContent(task.content ?? "");
                  setIsEditing(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1 text-zinc-400 hover:text-blue-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Edit task"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.preventDefault()}
                className="p-1 text-zinc-400 hover:text-red-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={restoreTask ? "Delete permanently" : "Delete task"}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal — portalled to document.body to escape CSS transform context */}
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
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Task title…"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Add a description…"
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none"
                />
              </div>

              {task.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600">
                  <Calendar className="w-3 h-3" />
                  <span>Created {formatDate(task.created_at)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(task.title ?? "");
                  setEditContent(task.content ?? "");
                }}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal — portalled to document.body */}
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
                <Trash2 className="w-4 h-4 text-red-400" />
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Delete Task</h2>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <span className="font-medium text-zinc-900 dark:text-zinc-100">&ldquo;{task.title || "this task"}&rdquo;</span>? This cannot be undone.
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
                  deleteTask(task.id);
                  setIsDeleteDialogOpen(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-red-500 text-white font-medium rounded-lg hover:bg-red-500/90 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
