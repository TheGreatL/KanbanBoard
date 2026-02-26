"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { useTransition, animated } from "@react-spring/web";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-100 dark:border-emerald-900/30",
    bgClass: "bg-white dark:bg-zinc-950",
    iconContainer: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  error: {
    icon: AlertCircle,
    colorClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-100 dark:border-rose-900/30",
    bgClass: "bg-white dark:bg-zinc-950",
    iconContainer: "bg-rose-50 dark:bg-rose-500/10",
  },
  info: {
    icon: Info,
    colorClass: "text-zinc-600 dark:text-zinc-400",
    borderClass: "border-zinc-100 dark:border-zinc-800",
    bgClass: "bg-white dark:bg-zinc-950",
    iconContainer: "bg-zinc-50 dark:bg-zinc-900",
  },
  warning: {
    icon: AlertTriangle,
    colorClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-100 dark:border-amber-900/30",
    bgClass: "bg-white dark:bg-zinc-950",
    iconContainer: "bg-amber-50 dark:bg-amber-500/10",
  },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTime = useRef<number>(toast.duration || 5000);
  const lastTick = useRef<number>(Date.now());

  useEffect(() => {
    if (toast.duration === 0) return;

    const tick = () => {
      const now = Date.now();
      if (!isPaused) {
        remainingTime.current -= (now - lastTick.current);
        if (remainingTime.current <= 0) {
          onRemove(toast.id);
        }
      }
      lastTick.current = now;
    };

    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isPaused, toast.duration, toast.id, onRemove]);

  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        lastTick.current = Date.now();
        setIsPaused(false);
      }}
      className={cn(
        "group relative pointer-events-auto flex flex-col min-w-[320px] max-w-md overflow-hidden rounded-xl border shadow-lg bg-white dark:bg-zinc-950 transition-all duration-200",
        config.borderClass
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", config.iconContainer, config.colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mb-0.5 leading-none">
              {toast.title}
            </h4>
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-normal">
            {toast.message}
          </p>
          {toast.action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="mt-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors uppercase tracking-widest"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 -mr-1 rounded-md text-zinc-300 hover:text-zinc-900 dark:text-zinc-700 dark:hover:text-zinc-100 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type, title, message, duration = 5000, action }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration, action }]);
  }, []);

  const transitions = useTransition(toasts, {
    from: { opacity: 0, transform: "translateY(10px) scale(0.98)" },
    enter: { opacity: 1, transform: "translateY(0px) scale(1)" },
    leave: { opacity: 0, transform: "translateY(5px) scale(0.98)" },
    config: { mass: 1, tension: 400, friction: 26 },
    keys: (toast) => toast.id,
  });

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100000] flex flex-col gap-3 pointer-events-none">
        {transitions((style, toast) => (
          <animated.div style={style}>
            <ToastItem toast={toast} onRemove={hideToast} />
          </animated.div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
