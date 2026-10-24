import { cn } from "@/lib/utils";
import type { Cleaner } from "@/lib/types";

export function CleanerAvatar({
  cleaner,
  size = "md",
  online,
}: {
  cleaner: Pick<Cleaner, "initials" | "hue" | "name" | "online">;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
}) {
  const dim =
    size === "sm"
      ? "size-8 text-[10px]"
      : size === "lg"
        ? "size-14 text-lg"
        : size === "xl"
          ? "size-20 text-2xl"
          : "size-11 text-sm";
  const show = online ?? cleaner.online;
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-primary-foreground ring-2 ring-card",
          dim,
        )}
        style={{
          background: `linear-gradient(160deg, hsl(${cleaner.hue} 28% 42%), hsl(${cleaner.hue} 32% 28%))`,
        }}
        aria-hidden
      >
        {cleaner.initials}
      </span>
      {show && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-success ring-2 ring-card" />
      )}
      <span className="sr-only">{cleaner.name}</span>
    </span>
  );
}
