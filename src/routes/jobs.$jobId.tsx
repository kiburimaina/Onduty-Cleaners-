import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Star } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { CleanerAvatar } from "@/components/layout/avatar";
import { CityMap } from "@/components/map/city-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { CLEANERS, HOME_SIZES, PLANTS, jobHeadline, loadById, nearestCleaners, plantById, serviceById } from "@/lib/data";
import { cancelJob, createDispute, getJob, rateCustomer, rateJob, updateJobStatus } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Cleaner, Job } from "@/lib/types";
import { cn, formatEta, formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({ component: JobTrackPage });

function JobTrackPage() {
  return (
    <Shell flush>
      <RequireAuth>
        <TrackInner />
      </RequireAuth>
    </Shell>
  );
}

function TrackInner() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [stars, setStars] = useState(5);
  const [tip, setTip] = useState(0);
  const [disputeOn, setDisputeOn] = useState(false);
  const [reason, setReason] = useState("quality");
  const [detail, setDetail] = useState("");
  const [crewStars, setCrewStars] = useState(5);
  const setDraft = useAppStore((s) => s.setDraft);

  useEffect(() => {
    let on = true;
    const load = () =>
      getJob({ data: { jobId } })
        .then((d) => on && setJob(d))
        .catch(() => on && setJob(null));
    void load();
    const t = window.setInterval(() => void load(), 1200);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, [jobId]);

  const cleaner = useMemo(() => resolveCleaner(job), [job]);

  if (job === undefined) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <Button asChild className="mt-6">
          <Link to="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  const service = serviceById(job.serviceId);
  const size = HOME_SIZES.find((s) => s.id === job.size)?.label;
  const plant = plantById(job.plantId);
  const load = loadById(job.laundryLoad);
  const dropoff = job.serviceId === "laundry" && job.laundryMode === "dropoff";
  const delivery = job.serviceId === "laundry" && job.laundryMode === "delivery";
  const isLaundry = job.serviceId === "laundry";
  const dry = isLaundry && job.offer === "dryclean";
  const pieceCount = job.pieces.reduce((n, p) => n + p.qty, 0);
  const searching = job.status === "searching";
  const moving =
    cleaner && !dropoff && (job.status === "en_route" || job.status === "arrived" || job.status === "in_progress")
      ? {
          from: { x: cleaner.x, y: cleaner.y },
          progress: job.status === "en_route" ? job.travelProgress : 1,
          initials: cleaner.initials,
          hue: cleaner.hue,
        }
      : undefined;
  const nearby = nearestCleaners(job.serviceId, 6);
  const subtitle = isLaundry
    ? dry
      ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"} · ${dropoff ? plant.name : job.address}`
      : `${dropoff ? plant.address : job.address} · ${load.label} bag`
    : `${job.address} · ${size}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:py-5">
      <CityMap
        className="h-[36vh] min-h-[240px] lg:min-h-[520px]"
        cleaners={dropoff ? [] : searching ? nearby : cleaner ? [cleaner] : nearby}
        searching={searching}
        moving={moving}
        plants={isLaundry ? PLANTS : []}
        selectedPlantId={job.plantId}
        liveLabel={dropoff ? plant.name : undefined}
      />

      <section className="flex min-h-0 flex-col gap-5 overflow-y-auto rounded-[28px] bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone={job.status === "complete" ? "success" : "primary"}>{jobHeadline(job)}</Badge>
            <h1 className="mt-2 text-2xl font-semibold text-ink">
              {isLaundry ? (dry ? "Dry clean" : dropoff ? "Drop-off laundry" : delivery ? "Laundry delivery" : "Home collect") : service.name}
              {job.addLaundry ? " + laundry" : ""}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {job.status === "en_route" && (
            <p className="text-right">
              <span className="block text-3xl font-semibold tabular text-ink">{formatEta(job.etaMinutes)}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">ETA</span>
            </p>
          )}
        </div>

        {searching && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">{isLaundry ? "Matching a collector nearby" : "Matching a crew nearby"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Live crews on duty get the ping first. If nobody takes it, we assign a roster cleaner.
            </p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 origin-left animate-pulse bg-primary" />
            </div>
          </div>
        )}

        {dropoff && (job.status === "matched" || job.status === "in_progress") && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">{plant.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plant.address} · {plant.hours}. The wash starts on its own — no extra tap. You'll get a ping when it's ready.
            </p>
          </div>
        )}

        {cleaner && job.status !== "searching" && !dropoff && (
          <div className="flex items-center gap-3 rounded-lg bg-background p-3">
            <CleanerAvatar cleaner={cleaner} size="lg" online />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{cleaner.name}</p>
              <p className="text-sm text-muted-foreground">
                {cleaner.rating.toFixed(2)} · {job.role === "cleaner" ? job.customerName : `${cleaner.jobs.toLocaleString()} jobs`}
              </p>
            </div>
            {CLEANERS.some((c) => c.id === cleaner.id) && (
              <Button asChild size="sm" variant="outline">
                <Link to="/cleaners/$cleanerId" params={{ cleanerId: cleaner.id }}>
                  Profile
                </Link>
              </Button>
            )}
          </div>
        )}

        {(job.status === "en_route" || job.status === "in_progress") && (
          <div>
            <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
              <span>
                {job.status === "en_route" ? (isLaundry ? "Collect run" : "Travel") : isLaundry ? "Wash" : "Checklist"}
              </span>
              <span className="tabular">
                {Math.round((job.status === "en_route" ? job.travelProgress : job.cleanProgress) * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round((job.status === "en_route" ? job.travelProgress : job.cleanProgress) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {job.status === "arrived" && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">
              {isLaundry
                ? `${cleaner?.name.split(" ")[0] ?? "Your collector"} has the bags.`
                : `${cleaner?.name.split(" ")[0] ?? "Your cleaner"} is at the door.`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Work starts automatically. The card stays on hold until it's done.</p>
          </div>
        )}

        {job.status === "scheduled" && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">On the calendar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.scheduledFor
                ? new Date(job.scheduledFor).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Time to be confirmed"}
              . It goes live on its own. The card hold is already on.
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => void updateJobStatus({ data: { jobId: job.id, status: dropoff ? "matched" : "searching" } }).then((d) => d && setJob(d))}
            >
              Start this job now
            </Button>
          </div>
        )}

        {(job.status === "in_progress" || job.status === "complete") && (
          <ul className="space-y-2">
            {job.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    item.done ? "bg-success text-success-foreground" : "bg-muted text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </li>
            ))}
          </ul>
        )}

        {job.status === "complete" && job.role === "customer" && job.rating == null && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">{isLaundry ? "How was the wash?" : "How was the visit?"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.paymentStatus === "captured"
                ? `Card charged ${formatMoney(job.price)} automatically.`
                : job.paymentStatus === "authorized"
                  ? "Card is still on hold — the charge finishes with this job."
                  : "Receipt is ready."}
            </p>
            {isLaundry && job.laundryMode !== "delivery" && (
              <p className="mt-1 text-sm text-muted-foreground">
                Pick up at {plant.name}, {plant.address}. {plant.hours}.
              </p>
            )}
            {isLaundry && job.laundryMode === "delivery" && (
              <p className="mt-1 text-sm text-muted-foreground">Delivered to {job.address}.</p>
            )}
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)} className="size-11 rounded-md" aria-label={`${n} stars`}>
                  <Star className={cn("mx-auto size-7", n <= stars ? "fill-primary text-primary" : "text-border")} />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Tip</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[0, Math.round(job.price * 0.1), Math.round(job.price * 0.15), Math.round(job.price * 0.2)].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTip(amount)}
                  className={cn(
                    "h-10 rounded-full px-3 text-sm font-medium",
                    tip === amount ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {amount === 0 ? "No tip" : formatMoney(amount)}
                </button>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                void rateJob({ data: { jobId: job.id, rating: stars, tip } }).then((d) => {
                  if (d) setJob(d);
                  toast("Thanks — receipt saved");
                });
              }}
            >
              Submit rating · {formatMoney(job.price + tip)}
            </Button>
          </div>
        )}

        {job.status === "complete" && job.role === "cleaner" && job.customerRating == null && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">Rate {job.customerName}</p>
            <p className="mt-1 text-sm text-muted-foreground">Customers see this on their side. It stays between you and OnDuty.</p>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setCrewStars(n)} className="size-11 rounded-md" aria-label={`${n} stars`}>
                  <Star className={cn("mx-auto size-7", n <= crewStars ? "fill-primary text-primary" : "text-border")} />
                </button>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                void rateCustomer({ data: { jobId: job.id, rating: crewStars } }).then((d) => {
                  if (d) setJob(d);
                  toast("Rating saved");
                });
              }}
            >
              Submit
            </Button>
          </div>
        )}

        {job.status === "complete" && job.role === "customer" && job.rating != null && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">Receipt</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {dry ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"}` : isLaundry ? `${load.label} bag` : `Labor · ${job.hours} hr`}
                </dt>
                <dd className="tabular">{formatMoney(job.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tip</dt>
                <dd className="tabular">{formatMoney(job.tip)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Card</dt>
                <dd className="capitalize">
                  {job.paymentStatus === "captured" ? "Charged" : job.paymentStatus === "authorized" ? "Hold" : job.paymentStatus === "voided" ? "Released" : "—"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{formatMoney(job.price + job.tip)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">You rated this {job.rating} / 5.</p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => {
                setDraft({
                  serviceId: job.serviceId,
                  size: job.size,
                  address: job.address,
                  notes: job.notes,
                  laundryMode: job.laundryMode ?? "collect",
                  laundryLoad: job.laundryLoad ?? "medium",
                  plantId: job.plantId ?? "harbor",
                  addLaundry: job.addLaundry,
                  offer: job.offer,
                  pieces: job.pieces,
                  cleanerId: CLEANERS.some((c) => c.id === job.cleanerId) ? job.cleanerId : null,
                  whenKind: "now",
                  cadence: "none",
                });
                void navigate({ to: "/book" });
              }}
            >
              Book this again
            </Button>
          </div>
        )}

        {disputeOn ? (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">Report a problem</p>
            <Label className="mt-3">Reason</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {["quality", "damage", "missing item", "no-show", "billing"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    "h-10 rounded-full px-3 text-sm capitalize",
                    reason === r ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea className="mt-3" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What happened?" />
            <Button
              className="mt-3 w-full"
              onClick={() => {
                void createDispute({ data: { jobId: job.id, reason, detail } }).then(() => {
                  toast("Dispute opened. Ops has it.");
                  setDisputeOn(false);
                });
              }}
            >
              Submit dispute
            </Button>
          </div>
        ) : (
          job.status !== "searching" && (
            <button type="button" className="h-11 text-left text-sm text-muted-foreground" onClick={() => setDisputeOn(true)}>
              Report a problem
            </button>
          )
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          {(job.status === "searching" || job.status === "matched" || job.status === "scheduled") && (
            <Button
              variant="outline"
              onClick={() => {
                void cancelJob({ data: { jobId: job.id } }).then(() => {
                  toast("Job cancelled · hold released");
                  void navigate({ to: "/jobs" });
                });
              }}
            >
              Cancel
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/jobs">All jobs</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function resolveCleaner(job: Job | null | undefined): Cleaner | null {
  if (!job?.cleanerId) return null;
  const roster = CLEANERS.find((c) => c.id === job.cleanerId);
  if (roster) return roster;
  const name = job.cleanerName ?? "Cleaner";
  return {
    id: job.cleanerId,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    hue: 200,
    rating: 5,
    jobs: 1,
    years: 1,
    specialties: [],
    bio: "",
    rate: 0,
    languages: [],
    etaMin: 8,
    x: 30,
    y: 40,
    online: true,
    city: "Riverside",
  };
}
