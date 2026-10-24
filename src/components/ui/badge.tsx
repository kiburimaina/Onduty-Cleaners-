import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "muted" | "primary" | "success" | "silver";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "muted" && "bg-secondary text-secondary-foreground",
        tone === "primary" && "bg-primary/12 text-primary",
        tone === "success" && "bg-success/12 text-success",
        tone === "silver" && "bg-silver/50 text-ink",
        className,
      )}
      {...props}
    />
  );
}
