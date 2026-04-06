export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--bg-hover,rgba(255,255,255,0.05))] rounded ${className}`} />;
}
