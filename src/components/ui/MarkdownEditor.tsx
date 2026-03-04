"use client";

import { useState, useRef, useCallback } from "react";
import { 
  Heading, 
  Bold, 
  Italic, 
  Code, 
  Link, 
  List, 
  ListOrdered, 
  CheckSquare, 
  AtSign, 
  Image as ImageIcon,
  RotateCcw,
  MessageSquare,
  Strikethrough
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [history, setHistory] = useState<string[]>([value]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current
    const previousValue = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    onChange(previousValue);
  }, [history, onChange]);

  const insertText = useCallback((type: "heading" | "bold" | "italic" | "strikethrough" | "code" | "link" | "list" | "ordered-list" | "checklist" | "mention" | "quote" | "image") => {
    if (!textareaRef.current) return;

    let before = "";
    let after = "";

    switch (type) {
      case "heading": before = "### "; break;
      case "bold": before = "**"; after = "**"; break;
      case "italic": before = "*"; after = "*"; break;
      case "strikethrough": before = "~~"; after = "~~"; break;
      case "code": before = "`"; after = "`"; break;
      case "link": before = "["; after = "](url)"; break;
      case "list": before = "- "; break;
      case "ordered-list": before = "1. "; break;
      case "checklist": before = "- [ ] "; break;
      case "mention": before = "@"; break;
      case "quote": before = "> "; break;
      case "image": before = "![alt]("; after = ")"; break;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selection = value.substring(start, end);
    
    const newValue = 
      value.substring(0, start) + 
      before + 
      (selection || "") + 
      after + 
      value.substring(end);

    onChange(newValue);
    setHistory(prev => [...prev, newValue]);

    // Reset focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + before.length + (selection?.length || 0) + after.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Only push to history if it's a significant change or periodically
    // Simple approach: push whenever manual change happens (handled in textarea onChange)
    if (newValue !== value) {
      setHistory(prev => {
        // Limit history size to 50
        const next = [...prev, newValue];
        if (next.length > 50) return next.slice(next.length - 50);
        return next;
      });
    }
  };

  const toolbarActions = [
    { icon: Heading, label: "Heading", type: "heading" as const },
    { icon: Bold, label: "Bold", type: "bold" as const },
    { icon: Italic, label: "Italic", type: "italic" as const },
    { icon: Strikethrough, label: "Strikethrough", type: "strikethrough" as const },
    { icon: Code, label: "Code", type: "code" as const },
    { icon: Link, label: "Link", type: "link" as const },
    { icon: List, label: "List", type: "list" as const },
    { icon: ListOrdered, label: "Ordered List", type: "ordered-list" as const },
    { icon: CheckSquare, label: "Task List", type: "checklist" as const },
    { icon: AtSign, label: "Mention", type: "mention" as const },
    { icon: MessageSquare, label: "Comment", type: "quote" as const },
    { icon: ImageIcon, label: "Image", type: "image" as const },
    { icon: RotateCcw, label: "Undo", type: "undo" as const }, 
  ];

  const renderPreview = (text: string) => {
    if (!text) return <p className="text-zinc-400 italic">Nothing to preview</p>;
    
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col gap-1">
          {text.split("\n").map((line, i) => {
            if (line.startsWith("### ")) {
              return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace("### ", "")}</h3>;
            }
            if (line.startsWith("- ")) {
              return (
                <div key={i} className="flex items-start gap-2 ml-1">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                  <span>{line.replace("- ", "")}</span>
                </div>
              );
            }
            if (line.startsWith("1. ")) {
              return (
                <div key={i} className="flex items-start gap-2 ml-1">
                  <span className="font-medium text-zinc-500 w-4 shrink-0">{line.split(".")[0]}.</span>
                  <span>{line.replace(/^\d+\.\s/, "")}</span>
                </div>
              );
            }
            if (line.startsWith("> ")) {
              return (
                <blockquote key={i} className="border-l-4 border-zinc-200 dark:border-zinc-800 pl-4 italic my-2">
                  {line.replace("> ", "")}
                </blockquote>
              );
            }
            return <p key={i} className="min-h-[1em] mb-1">{line}</p>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer",
              activeTab === "write" 
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer",
              activeTab === "preview" 
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Preview
          </button>
        </div>

        {/* Toolbar (only visible in write mode) */}
        {activeTab === "write" && (
          <div className="flex items-center gap-0.5 py-1">
            {toolbarActions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.type === "undo") undo();
                  else insertText(item.type);
                }}
                title={item.label}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative min-h-40">
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-full min-h-40 p-4 text-sm bg-transparent border-none focus:ring-0 resize-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        ) : (
          <div className="p-4 min-h-40 overflow-auto max-h-75">
            {renderPreview(value)}
          </div>
        )}
      </div>
    </div>
  );
}
