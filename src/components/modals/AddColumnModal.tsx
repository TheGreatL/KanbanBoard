"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Columns, Check, Loader2 } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (title: string, color: string) => Promise<void>;
  availableColors: string[];
  dotColorMap: Record<string, string>;
}

export default function AddColumnModal({
  isOpen,
  onClose,
  onAddColumn,
  availableColors,
  dotColorMap,
}: AddColumnModalProps) {
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("zinc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const columnTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        columnTitleInputRef.current?.focus();
        columnTitleInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimTitle = newColumnTitle.trim();
    if (!trimTitle) return;

    setIsSubmitting(true);
    await onAddColumn(trimTitle, newColumnColor);
    setNewColumnTitle("");
    setNewColumnColor("zinc");
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
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
              onClose();
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
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
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
              {availableColors.map((color) => (
                  <Tooltip key={color} text={color}>
                    <button
                      onClick={() => setNewColumnColor(color)}
                      className={`w-full aspect-square rounded-full ${dotColorMap[color]} hover:scale-110 transition-transform flex items-center justify-center cursor-pointer ${newColumnColor === color ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950 shadow-sm' : ''}`}
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
              onClose();
              setNewColumnTitle("");
              setNewColumnColor("zinc");
            }}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
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
  );
}
