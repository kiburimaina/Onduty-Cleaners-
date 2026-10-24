import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { CityMap } from "@/components/map/city-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HOME_SIZES, LIVE_STATUSES, CREW_SHARE, serviceById } from "@/lib/data";
import { acceptJob, getMe, listMyJobs, listOpenJobs, setDuty } from "@/lib/api";
import type { Job, Me } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/duty")({ component: DutyPage });

function DutyPage() {
  return (
    <Shell flush>
      <RequireAuth>
        <DutyInner />
      </RequireAuth>
    </Shell>
  );
}

function DutyInner() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  function refresh() {
    void getMe().then(setMe);
    void listOpenJobs().then(setOpen);
    void listMyJobs().then(setMine);
  }

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2500);
    return () => window.clearInterval(t);
  }, []);

  const visibleOpen = open.filter((j) => !skipped.includes(j.id));
  const online = Boolean(me?.dutyOnline);
  const live = mine.filter((j) => j.role === "cleaner" && LIVE_STATUSES.includes(j.status));
  const done = mine.filter((j) => j.role === "cleaner" && j.status === "complete");
  const cleared = Boolean(me?.cleared);
  const vet = me?.vetting.status ?? "none";

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:py-5">
      <CityMap className="h-[36vh] min-h-[240px] lg:min-h-[520px]" searching={online && visibleOpen.length === 0} />

      <section className="flex min-h-0 flex-col gap-5 overflow-y-auto rounded-[28px] bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cleaner seat</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">On duty</h1>
            {cleared && (
              <Link to="/earnings" className="mt-1 inline-block text-sm font-medium text-primary">
                Earnings
              </Link>
            )}
          </div>
          {cleared && (
            <button
              type="button"
              onClick={() => {
                void setDuty({ data: { online: !online } })
                  .then((r) => {
                    setMe((m) => (m ? { ...m, dutyOnline: r.online } : m));
                    toast(r.online ? "You're on duty" : "You're offline");
                  })
                  .catch((e: Error) => toast(e.message));
              }}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                online ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              <Radio className="size-4" />
              {online ? "Online" : "Offline"}
            </button>
          )}
        </div>

        {!cleared && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">
              {vet === "pending"
                ? "Staff is reviewing you"
                : vet === "needs_info"
                  ? "Staff needs another file"
                  : vet === "rejected"
                    ? "Not approved yet"
                    : "Checks before you go online"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {vet === "pending"
                ? "ID, selfie, and good conduct are with ops. You'll get a ping when you're cleared."
                : "National ID, a live face photo, and a certificate of good conduct. Staff signs off, the same idea as Uber driver vetting."}
            </p>
            {me?.vetting.staffNote && vet !== "pending" && (
              <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm">{me.vetting.staffNote}</p>
            )}
            <Button asChild className="mt-4 w-full">
              <Link to="/apply">{vet === "pending" ? "See application" : "Start crew checks"}</Link>
            </Button>
          </div>
        )}

        {cleared && !online && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">Go online to take jobs</p>
            <p className="mt-1 text-sm text-muted-foreground">You're cleared. Same map the customer sees. Pings stay until you accept or they match elsewhere.</p>
          </div>
        )}

        {cleared && online && visibleOpen.length === 0 && live.length === 0 && (
          <div className="rounded-lg bg-background p-4">
            <p className="font-semibold">Waiting for a ping</p>
            <p className="mt-1 text-sm text-muted-foreground">Stay near Riverside. Standard, deep, turnover, and laundry collect land first.</p>
          </div>
        )}

        {cleared && online && visibleOpen.length > 0 && (
          <ul className="space-y-3">
            {visibleOpen.map((job) => (
              <li key={job.id} className="rounded-xl bg-ink p-5 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <Badge tone="silver">New job</Badge>
                  <span className="text-sm tabular">{formatMoney(Math.round(job.price * CREW_SHARE))}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{job.customerName}</h2>
                <p className="mt-1 text-sm text-silver">
                  {serviceById(job.serviceId).name} · {HOME_SIZES.find((s) => s.id === job.size)?.label} · {job.address}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="silver" onClick={() => setSkipped((s) => [...s, job.id])}>
                    Skip
                  </Button>
                  <Button
                    onClick={() => {
                      void acceptJob({ data: { jobId: job.id } })
                        .then((taken) => {
                          toast("Job accepted");
                          void navigate({ to: "/jobs/$jobId", params: { jobId: taken.id } });
                        })
                        .catch((e: Error) => toast(e.message));
                    }}
                  >
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {live.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Active job</h2>
            <ul className="mt-2 space-y-2">
              {live.map((job) => (
                <li key={job.id}>
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: job.id }}
                    className="flex items-center justify-between rounded-xl bg-background p-4"
                  >
                    <span>
                      <span className="block font-semibold">{job.customerName}</span>
                      <span className="text-sm text-muted-foreground">{serviceById(job.serviceId).name}</span>
                    </span>
                    <Badge>{job.status.replace("_", " ")}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {done.length > 0 && (
          <p className="text-sm text-muted-foreground">{done.length} jobs completed this seat</p>
        )}
      </section>
    </div>
  );
}
