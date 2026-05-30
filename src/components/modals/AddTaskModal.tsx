"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, LayoutList, AlignLeft, Loader2, Check } from "lucide-react";
import { ColumnType } from "../Column";
import MarkdownEditor from "../ui/MarkdownEditor";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnType[];
  selectedColumnId: string;
  onSelectedColumnIdChange: (id: string) => void;
  onAddTask: (columnId: string, title: string, content: string) => Promise<void>;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  columns,
  selectedColumnId,
  onSelectedColumnIdChange,
  onAddTask,
}: AddTaskModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        addTitleInputRef.current?.focus();
        addTitleInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedColumnId) return;
    const trimTitle = newTaskTitle.trim();
    const trimContent = newTaskContent.trim();
    if (!trimTitle && !trimContent) return;

    setIsSubmitting(true);
    await onAddTask(selectedColumnId, trimTitle, trimContent);
    setNewTaskTitle("");
    setNewTaskContent("");
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-200 overflow-y-auto bg-black/40 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
            setNewTaskTitle("");
            setNewTaskContent("");
          }
        }}
      >
        {/* ── Header (always visible) ── */}
        <div className="flex items-center justify-between shrink-0 px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <Plus className="w-4 h-4" />
            <h2>Create New Task</h2>
          </div>
          <button
            onClick={() => {
              onClose();
              setNewTaskTitle("");
              setNewTaskContent("");
            }}
            title="Close modal"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              Select Column
            </label>
            <select
              value={selectedColumnId}
              title="Select column"
              onChange={(e) => onSelectedColumnIdChange(e.target.value)}
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
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
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

          <div className="flex flex-col gap-1.5 pb-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              <AlignLeft className="w-3 h-3" />
              Description
            </label>
            <MarkdownEditor
              value={newTaskContent}
              onChange={setNewTaskContent}
              placeholder="Add some details..."
            />
          </div>
        </div>

        {/* ── Footer (always visible) ── */}
        <div className="flex items-center justify-end gap-3 shrink-0 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => {
              onClose();
              setNewTaskTitle("");
              setNewTaskContent("");
            }}
            className="px-4 cursor-pointer py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || (!newTaskTitle.trim() && !newTaskContent.trim())}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Task
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
