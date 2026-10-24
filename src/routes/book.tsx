import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Locate, MapPin, Sparkles } from "lucide-react";
import { z } from "zod";
import { Shell } from "@/components/layout/site-header";
import { CleanerAvatar } from "@/components/layout/avatar";
import { CityMap } from "@/components/map/city-map";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  CLEANERS,
  COLLECT_FEE,
  DRYCLEAN_ITEMS,
  HOME_SIZES,
  LAUNDRY_LOADS,
  PLANTS,
  RETURN_FEE,
  SERVICES,
  loadById,
  nearestCleaners,
  plantById,
  quoteHours,
  quotePrice,
  serviceById,
} from "@/lib/data";
import { createJob, getMe, listPlaces, paystackReady, reverseGeocode, startPaystackCheckout } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Cadence, HomeSize, LaundryLoad, LaundryMode, Place, ServiceId, ShopOffer, WhenKind } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";

const searchSchema = z.object({
  service: z
    .enum(["standard", "deep", "move", "office", "airbnb", "afterparty", "laundry"])
    .optional(),
});

export const Route = createFileRoute("/book")({
  validateSearch: searchSchema,
  component: BookPage,
});

function BookPage() {
  const { service } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const draft = useAppStore((s) => s.draft);
  const setDraft = useAppStore((s) => s.setDraft);
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [paystack, setPaystack] = useState(false);
  const [payCurrency, setPayCurrency] = useState("KES");

  useEffect(() => {
    if (!user) return;
    void listPlaces().then(setPlaces).catch(() => setPlaces([]));
    void paystackReady()
      .then((r) => {
        setPaystack(r.enabled);
        setPayCurrency(r.currency);
      })
      .catch(() => setPaystack(false));
  }, [user]);

  useEffect(() => {
    if (service && service !== draft.serviceId) setDraft({ serviceId: service });
  }, [service, draft.serviceId, setDraft]);

  const isLaundry = draft.serviceId === "laundry";
  const dry = isLaundry && draft.offer === "dryclean";
  const dropoff = isLaundry && draft.laundryMode === "dropoff";
  const pieceCount = draft.pieces.reduce((n, p) => n + p.qty, 0);
  const nearby = useMemo(
    () => (dropoff ? [] : nearestCleaners(draft.serviceId, 4)),
    [draft.serviceId, dropoff],
  );
  const selected = CLEANERS.find((c) => c.id === draft.cleanerId) ?? null;
  const plant = plantById(draft.plantId);
  const load = loadById(draft.laundryLoad);
  const hours = quoteHours(draft.serviceId, draft.size);
  const price = quotePrice(draft.serviceId, draft.size, selected?.rate, {
    mode: draft.laundryMode,
    load: draft.laundryLoad,
    addLaundry: draft.addLaundry,
    offer: draft.offer,
    pieces: draft.pieces,
  });

  async function confirm(cleanerId: string | null) {
    if (dry && pieceCount === 0) {
      toast("Add at least one piece");
      return;
    }
    if (!dropoff && !draft.address.trim()) {
      toast("Add an address to continue");
      return;
    }
    if (draft.whenKind === "schedule" && !draft.scheduledFor) {
      toast("Pick a time for the visit");
      return;
    }
    if (isPending) return;
    if (!user) {
      void navigate({ to: "/login", search: { redirect: "/book" } });
      return;
    }
    setBusy(true);
    try {
      const me = await getMe();
      const booking = {
        serviceId: draft.serviceId,
        size: draft.size,
        whenKind: draft.whenKind,
        scheduledFor: draft.whenKind === "schedule" && draft.scheduledFor ? new Date(draft.scheduledFor).toISOString() : null,
        address: draft.address,
        notes: draft.notes,
        cleanerId: dropoff ? null : cleanerId,
        laundryMode: isLaundry ? draft.laundryMode : draft.addLaundry ? ("collect" as const) : null,
        laundryLoad: isLaundry || draft.addLaundry ? draft.laundryLoad : null,
        plantId: isLaundry ? draft.plantId : null,
        addLaundry: !isLaundry && draft.addLaundry,
        cadence: draft.cadence,
        customerName: user.displayName ?? me.profile.name ?? "You",
        offer: dry ? ("dryclean" as const) : ("wash" as const),
        pieces: dry ? draft.pieces : [],
      };
      if (paystack) {
        const { url } = await startPaystackCheckout({ data: booking });
        window.location.assign(url);
        return;
      }
      if (!me.wallet) {
        toast("Add a card to book");
        void navigate({ to: "/wallet" });
        return;
      }
      const job = await createJob({ data: booking });
      void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not book";
      if (msg.toLowerCase().includes("card")) void navigate({ to: "/wallet" });
      toast(msg);
    } finally {
      setBusy(false);
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      toast("Location isn't available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void reverseGeocode({ data: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
          .then((r) => setDraft({ address: r.address }))
          .catch(() => toast("Couldn't read that pin"));
      },
      () => toast("Allow location to fill the address"),
    );
  }

  const cta = (() => {
    if (dry && pieceCount === 0) return "Add a piece";
    if (!user && !isPending) return "Sign in to book";
    if (draft.whenKind === "schedule") return isLaundry ? "Schedule laundry" : "Schedule this clean";
    if (dropoff) return `Reserve ${plant.name}`;
    if (isLaundry && draft.laundryMode === "delivery") return selected ? `Deliver with ${selected.name.split(" ")[0]}` : "Collect and deliver";
    if (isLaundry) return selected ? `Collect with ${selected.name.split(" ")[0]}` : "Collect from home";
    return selected ? `Request ${selected.name.split(" ")[0]}` : "Find a cleaner";
  })();

  return (
    <Shell flush>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:py-5">
        <CityMap
          className="h-[36vh] min-h-[240px] lg:min-h-[520px]"
          cleaners={nearby}
          selectedId={draft.cleanerId}
          onSelect={(id) => setDraft({ cleanerId: id === draft.cleanerId ? null : id })}
          plants={isLaundry ? PLANTS : []}
          selectedPlantId={isLaundry ? draft.plantId : null}
          onSelectPlant={(id) => setDraft({ plantId: id })}
          liveLabel={dropoff ? `${PLANTS.length} wash plants` : undefined}
        />

        <section className="flex min-h-0 flex-col rounded-[28px] bg-card shadow-[var(--shadow-border)] lg:max-h-full">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Request</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink">
                {isLaundry ? "Book laundry" : "Book a cleaner"}
              </h1>
            </div>

            <div>
              <Label>Service</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ serviceId: s.id as ServiceId, cleanerId: null, addLaundry: s.id === "laundry" ? false : draft.addLaundry })}
                    className={cn(
                      "min-h-11 rounded-md px-3 py-2.5 text-left text-sm font-medium shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-150",
                      draft.serviceId === s.id
                        ? "bg-ink text-primary-foreground"
                        : "bg-background text-foreground hover:shadow-[var(--shadow-lift)]",
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {isLaundry && (
              <div>
                <Label>What we're cleaning</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {([
                    ["wash", "Wash & fold"],
                    ["dryclean", "Dry clean"],
                  ] as [ShopOffer, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraft({ offer: id })}
                      className={cn(
                        "h-11 rounded-full text-sm font-medium",
                        draft.offer === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLaundry && (
              <div>
                <Label>How it moves</Label>
                <div className="mt-1.5 grid gap-2">
                  {([
                    { id: "dropoff" as LaundryMode, title: "Drop at the plant", body: "You bring them in. You pick them up. No driver fee." },
                    { id: "collect" as LaundryMode, title: "Collect from home", body: `We pick up. You collect clean at the plant. +${formatMoney(COLLECT_FEE)}` },
                    { id: "delivery" as LaundryMode, title: "Collect and deliver", body: `Pickup and return to your door. +${formatMoney(COLLECT_FEE + RETURN_FEE)}` },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft({ laundryMode: opt.id, cleanerId: opt.id === "dropoff" ? null : draft.cleanerId })}
                      className={cn(
                        "min-h-16 rounded-md px-3 py-2.5 text-left shadow-[var(--shadow-border)]",
                        draft.laundryMode === opt.id ? "bg-ink text-primary-foreground" : "bg-background text-foreground",
                      )}
                    >
                      <span className="block text-sm font-semibold">{opt.title}</span>
                      <span className={cn("mt-0.5 block text-xs", draft.laundryMode === opt.id ? "text-silver" : "text-muted-foreground")}>
                        {opt.body}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLaundry && (
              <div>
                <Label>Wash plant</Label>
                <ul className="mt-1.5 space-y-2">
                  {PLANTS.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setDraft({ plantId: p.id })}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-lg p-2.5 text-left shadow-[var(--shadow-border)]",
                          draft.plantId === p.id ? "bg-secondary" : "bg-background",
                        )}
                      >
                        <span className="flex size-11 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-primary-foreground">
                          W
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.address} · {p.hours}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular">{p.walkMin} min</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!dropoff && (
              <div>
                <div className="flex items-end justify-between gap-2">
                  <Label htmlFor="address">{isLaundry ? (draft.laundryMode === "delivery" ? "Home address" : "Collect from") : "Where"}</Label>
                  <button type="button" className="inline-flex h-11 items-center gap-1 text-xs font-medium text-primary" onClick={useLocation}>
                    <Locate className="size-3.5" />
                    Use my location
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="address"
                    className="pl-9"
                    value={draft.address}
                    onChange={(e) => setDraft({ address: e.target.value })}
                    placeholder="Street address"
                    autoComplete="street-address"
                  />
                </div>
                {places.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {places.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDraft({ address: p.address })}
                        className={cn(
                          "h-10 rounded-full px-3 text-sm font-medium",
                          draft.address === p.address ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dry ? (
              <div>
                <Label>Pieces</Label>
                <ul className="mt-1.5 space-y-2">
                  {DRYCLEAN_ITEMS.map((item) => {
                    const qty = draft.pieces.find((p) => p.id === item.id)?.qty ?? 0;
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2">
                        <span>
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{formatMoney(item.price)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            className="size-11 rounded-full bg-secondary text-lg"
                            onClick={() => {
                              const next = draft.pieces.filter((p) => p.id !== item.id);
                              if (qty > 1) next.push({ id: item.id, qty: qty - 1 });
                              setDraft({ pieces: next });
                            }}
                            aria-label={`Fewer ${item.label}`}
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm font-semibold tabular">{qty}</span>
                          <button
                            type="button"
                            className="size-11 rounded-full bg-secondary text-lg"
                            onClick={() => {
                              const next = draft.pieces.filter((p) => p.id !== item.id);
                              next.push({ id: item.id, qty: qty + 1 });
                              setDraft({ pieces: next });
                            }}
                            aria-label={`More ${item.label}`}
                          >
                            +
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : isLaundry ? (
              <div>
                <Label>Bag size</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {LAUNDRY_LOADS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDraft({ laundryLoad: s.id as LaundryLoad })}
                      className={cn(
                        "h-11 rounded-full px-3 text-sm font-medium",
                        draft.laundryLoad === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{load.kg} · wash, dry, fold</p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Home size</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {HOME_SIZES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDraft({ size: s.id as HomeSize })}
                        className={cn(
                          "h-11 min-w-16 rounded-full px-3 text-sm font-medium",
                          draft.size === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-lg bg-background px-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={draft.addLaundry}
                    onChange={(e) => setDraft({ addLaundry: e.target.checked, laundryLoad: "medium", laundryMode: "collect" })}
                  />
                  Add laundry collect ({formatMoney(loadById("medium").price + COLLECT_FEE)})
                </label>
              </>
            )}

            <div>
              <Label>When</Label>
              <div className="mt-1.5 flex gap-2">
                {(["now", "schedule"] as WhenKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraft({ whenKind: k })}
                    className={cn(
                      "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium",
                      draft.whenKind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {k === "now" ? <Sparkles className="size-3.5" /> : <Clock className="size-3.5" />}
                    {k === "now" ? "Now" : "Schedule"}
                  </button>
                ))}
              </div>
              {draft.whenKind === "schedule" && (
                <Input
                  type="datetime-local"
                  className="mt-2"
                  value={draft.scheduledFor}
                  onChange={(e) => setDraft({ scheduledFor: e.target.value })}
                />
              )}
            </div>

            <div>
              <Label>Repeat</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {([
                  ["none", "Once"],
                  ["weekly", "Weekly"],
                  ["biweekly", "Every 2 weeks"],
                ] as [Cadence, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDraft({ cadence: id })}
                    className={cn(
                      "h-11 rounded-full px-3 text-sm font-medium",
                      draft.cadence === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{isLaundry ? "Notes for the wash" : "Notes for the crew"}</Label>
              <Textarea
                id="notes"
                className="mt-1.5"
                placeholder={isLaundry ? "Stains, no-tumble items, bag count…" : "Gate code, pets, products to avoid…"}
                value={draft.notes}
                onChange={(e) => setDraft({ notes: e.target.value })}
              />
            </div>

            {!dropoff && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>{isLaundry ? "Collectors nearby" : "Nearby now"}</Label>
                  <button type="button" className="h-11 text-xs font-medium text-primary" onClick={() => setDraft({ cleanerId: null })}>
                    Auto-match
                  </button>
                </div>
                <ul className="space-y-2">
                  {nearby.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setDraft({ cleanerId: c.id })}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-lg p-2.5 text-left shadow-[var(--shadow-border)]",
                          draft.cleanerId === c.id ? "bg-secondary" : "bg-background",
                        )}
                      >
                        <CleanerAvatar cleaner={c} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.rating.toFixed(2)} · {c.jobs.toLocaleString()} jobs
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-semibold tabular">{c.etaMin} min</span>
                          <span className="text-xs text-muted-foreground">
                            {isLaundry ? "collect" : `${formatMoney(c.rate)}/hr`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 bg-card p-4 sm:px-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {dry
                  ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"}`
                  : isLaundry
                    ? `${load.label} bag${draft.laundryMode === "dropoff" ? "" : draft.laundryMode === "delivery" ? " · collect & return" : " · collect"}`
                    : `${serviceById(draft.serviceId).name} · ${hours} hr${draft.addLaundry ? " + laundry" : ""}`}
              </span>
              <span className="font-semibold tabular">{formatMoney(price)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paystack
                ? `Paystack test checkout in ${payCurrency}. Card 4084084084084081 · CVV 408 · PIN 0000 · OTP 123456.`
                : "Card on file is held now and charged automatically when the job finishes."}
            </p>
            <Button size="lg" className="mt-3 w-full" disabled={busy || (dry && pieceCount === 0)} onClick={() => void confirm(draft.cleanerId)}>
              {busy ? "Booking…" : cta}
            </Button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
