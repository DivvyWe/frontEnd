// src/components/ui/Skeleton.jsx
"use client";

function cls(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function Skeleton({
  className = "",
  rounded = "rounded-md",
  shimmer = true,
}) {
  return (
    <div
      className={cls(
        "relative overflow-hidden bg-slate-200",
        rounded,
        className
      )}
      aria-hidden="true"
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      )}
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export function SkeletonLine({ width = "w-3/4", className = "" }) {
  return <Skeleton className={cls("h-3", width, className)} />;
}

export function SkeletonAvatar({ size = "h-8 w-8", className = "" }) {
  return <Skeleton className={cls(size, className)} rounded="rounded-full" />;
}

export function SkeletonCard({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 h-4 w-20 rounded bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[56px_1fr_auto] items-center gap-3"
          >
            <div className="text-center">
              <Skeleton className="mx-auto mb-1 h-2 w-8" />
              <Skeleton className="mx-auto h-5 w-8" />
            </div>
            <div className="min-w-0">
              <SkeletonLine width="w-2/3" />
              <SkeletonLine className="mt-2 w-1/3" />
            </div>
            <div className="text-right">
              <Skeleton className="ml-auto h-5 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
