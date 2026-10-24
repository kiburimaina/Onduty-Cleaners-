import { CLEANERS } from "@/lib/data";
import type { Cleaner, LaundryPlant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/layout/logo-mark";

const HOME = { x: 48, y: 52 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function CityMap({
  className,
  cleaners = CLEANERS.filter((c) => c.online),
  selectedId,
  onSelect,
  home = HOME,
  moving,
  searching = false,
  plants = [],
  selectedPlantId,
  onSelectPlant,
  homeHidden = false,
  liveLabel,
}: {
  className?: string;
  cleaners?: Cleaner[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  home?: { x: number; y: number };
  moving?: { from: { x: number; y: number }; progress: number; initials: string; hue: number };
  searching?: boolean;
  plants?: LaundryPlant[];
  selectedPlantId?: string | null;
  onSelectPlant?: (id: string) => void;
  homeHidden?: boolean;
  liveLabel?: string;
}) {
  const mx = moving ? lerp(moving.from.x, home.x, moving.progress) : null;
  const my = moving ? lerp(moving.from.y, home.y, moving.progress) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] bg-map shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <rect width="100" height="100" fill="#d4e4ee" />
        <path d="M0 0 H100 V38 Q72 42 58 28 T0 22 Z" fill="#b7d3e4" />
        <rect x="8" y="40" width="18" height="22" rx="1.2" fill="#c2d0d9" />
        <rect x="28" y="36" width="14" height="18" rx="1.2" fill="#c8d5de" />
        <rect x="64" y="40" width="22" height="16" rx="1.2" fill="#c2d0d9" />
        <rect x="70" y="62" width="16" height="20" rx="1.2" fill="#c8d5de" />
        <rect x="10" y="68" width="20" height="16" rx="1.2" fill="#c2d0d9" />
        <rect x="54" y="18" width="12" height="14" rx="1.2" fill="#c8d5de" />
        <ellipse cx="22" cy="22" rx="10" ry="7" fill="#c5d5cc" />
        <ellipse cx="86" cy="80" rx="9" ry="6" fill="#c5d5cc" />
        <path d="M0 48 H100" stroke="#f7fbfc" strokeWidth="3.4" />
        <path d="M0 72 H100" stroke="#f7fbfc" strokeWidth="2.2" />
        <path d="M36 0 V100" stroke="#f7fbfc" strokeWidth="3.2" />
        <path d="M58 0 V100" stroke="#f7fbfc" strokeWidth="2" />
        <path d="M18 38 H88" stroke="#f7fbfc" strokeWidth="1.6" />
        <path d="M78 20 V92" stroke="#f7fbfc" strokeWidth="1.8" />
        {moving && mx !== null && my !== null && (
          <path
            d={`M ${moving.from.x} ${moving.from.y} Q ${(moving.from.x + home.x) / 2 - 4} ${(moving.from.y + home.y) / 2 - 8} ${home.x} ${home.y}`}
            fill="none"
            stroke="#2c7ba6"
            strokeWidth="0.7"
            strokeDasharray="1.6 1.2"
            opacity="0.7"
          />
        )}
      </svg>

      <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-border)]">
        Riverside · live
      </span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium tabular text-muted-foreground shadow-[var(--shadow-border)]">
        {liveLabel ?? `${cleaners.length} on duty`}
      </span>

      {!homeHidden && (
        <span
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${home.x}%`, top: `${home.y}%` }}
        >
          {searching && (
            <>
              <span className="radar-ring absolute inset-0 m-auto size-24 rounded-full border border-primary/40" />
              <span
                className="radar-ring absolute inset-0 m-auto size-24 rounded-full border border-primary/30"
                style={{ animationDelay: "0.8s" }}
              />
            </>
          )}
          <LogoMark className="relative size-10 shadow-[var(--shadow-lift)]" alt="Your home" />
        </span>
      )}

      {plants.map((p) => {
        const selected = selectedPlantId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPlant?.(p.id)}
            className="absolute z-[6] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`${p.name}, ${p.walkMin} minutes`}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-primary-foreground shadow-[var(--shadow-border)] ring-2",
                selected ? "ring-primary scale-110" : "ring-card",
              )}
            >
              W
            </span>
          </button>
        );
      })}

      {cleaners.map((c) => {
        if (moving && c.initials === moving.initials) return null;
        const selected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(c.id)}
            className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            aria-label={`${c.name}, ${c.etaMin} minutes away`}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground shadow-[var(--shadow-border)] ring-2",
                selected ? "ring-primary scale-110" : "ring-card",
              )}
              style={{
                background: `hsl(${c.hue} 30% 36%)`,
              }}
            >
              {c.initials}
            </span>
          </button>
        );
      })}

      {moving && mx !== null && my !== null && (
        <span
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{ left: `${mx}%`, top: `${my}%` }}
        >
          <span
            className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground ring-2 ring-card shadow-[var(--shadow-lift)]"
            style={{ background: `hsl(${moving.hue} 30% 36%)` }}
          >
            {moving.initials}
          </span>
        </span>
      )}
    </div>
  );
}
