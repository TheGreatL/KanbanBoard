"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FolderKanban, X, Check, Loader2, Pencil, Plus } from "lucide-react";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => Promise<void>;
  initialTitle?: string;
  mode: "create" | "edit";
}

export default function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  mode,
}: ProjectModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialTitle]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimTitle = title.trim();
    if (!trimTitle) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimTitle);
      onClose();
    } catch (err) {
      // Error handling is managed by the parent via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  const isEdit = mode === "edit";

  return createPortal(
    <div
      className="fixed inset-0 z-[202] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            {isEdit ? <Pencil className="w-4 h-4 text-blue-500" /> : <Plus className="w-4 h-4 text-zinc-500" />}
            <h2>{isEdit ? "Rename Project" : "Create New Project"}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Project Name
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <FolderKanban className="w-4 h-4 text-zinc-400" />
            </div>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
              placeholder="e.g. Design System, App Launch..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !title.trim() || (isEdit && title.trim() === initialTitle)}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
