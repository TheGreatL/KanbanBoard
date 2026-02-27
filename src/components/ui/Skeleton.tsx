"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "rectangular",
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-zinc-200 dark:bg-zinc-800",
        {
          "h-3 w-full rounded": variant === "text",
          "rounded-full": variant === "circular",
          "rounded-xl": variant === "rounded",
        },
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

// Specialized Loading States
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton variant="text" width="40%" height={16} className="mb-6" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton variant="rounded" width={24} height={24} className="shrink-0" />
            <Skeleton variant="text" width={`${[60, 45, 70, 50, 65][i % 5]}%`} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex-1 flex gap-8 h-full p-10 overflow-hidden justify-center items-start bg-zinc-50/50 dark:bg-transparent">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="w-[320px] shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((__, j) => (
              <div key={j} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 space-y-3 shadow-sm">
                <Skeleton variant="text" width="90%" height={14} />
                <Skeleton variant="text" width="60%" height={12} className="opacity-50" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton variant="text" width="30%" height={10} />
                  <Skeleton variant="circular" width={16} height={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-5">
        <Skeleton variant="circular" width={64} height={64} className="shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-5 py-3">
          <Skeleton variant="text" width="30%" height={12} />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton variant="text" width="20%" height={14} className="shrink-0" />
            <Skeleton variant="text" width="50%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
