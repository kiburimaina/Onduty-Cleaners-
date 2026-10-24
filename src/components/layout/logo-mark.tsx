import { cn } from "@/lib/utils";

export function LogoMark({ className, alt = "OnDuty Cleaners" }: { className?: string; alt?: string }) {
  return (
    <img
      src="/logo.jpg"
      alt={alt}
      className={cn(
        "rounded-full object-cover shadow-[var(--shadow-border)] outline-none",
        className,
      )}
    />
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LogoMark className={compact ? "size-8" : "size-10"} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-sm font-semibold tracking-tight text-ink">OnDuty</span>
        {!compact && (
          <span className="text-[0.6875rem] font-medium uppercase tracking-widest text-muted-foreground">
            Cleaners
          </span>
        )}
      </span>
    </span>
  );
}
