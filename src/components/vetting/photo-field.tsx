import { Camera, Check } from "lucide-react";
import { compressImage } from "@/lib/photo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PhotoField({
  label,
  hint,
  value,
  onChange,
  capture,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (dataUrl: string) => void;
  capture?: "user" | "environment";
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          "mt-1.5 flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl bg-card text-center shadow-[var(--shadow-border)]",
          value ? "p-0" : "gap-2 p-6",
        )}
      >
        {value ? (
          <span className="relative block w-full">
            <img src={value} alt="" className="max-h-56 w-full object-cover" />
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
              <Check className="size-3" />
              Saved
            </span>
          </span>
        ) : (
          <>
            <Camera className="size-6 text-primary" strokeWidth={1.75} />
            <span className="text-sm font-medium text-ink">Take or upload</span>
            <span className="max-w-xs text-xs text-muted-foreground">{hint}</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture={capture}
          className="sr-only"
          data-photo={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void compressImage(file)
              .then(onChange)
              .catch((err: Error) => toast(err.message));
          }}
        />
      </span>
    </label>
  );
}
