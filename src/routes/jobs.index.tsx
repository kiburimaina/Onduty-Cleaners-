import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { CleanerAvatar } from "@/components/layout/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLEANERS, HOME_SIZES, LIVE_STATUSES, jobHeadline, serviceById } from "@/lib/data";
import { listMyJobs } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import type { Job, JobStatus } from "@/lib/types";

export const Route = createFileRoute("/jobs/")({ component: JobsPage });

const TONE: Record<JobStatus, "primary" | "success" | "muted" | "silver"> = {
  searching: "primary",
  matched: "primary",
  en_route: "primary",
  arrived: "primary",
  in_progress: "primary",
  complete: "success",
  cancelled: "muted",
  scheduled: "silver",
};

function JobsPage() {
  return (
    <Shell>
      <RequireAuth>
        <JobsInner />
      </RequireAuth>
    </Shell>
  );
}

function JobsInner() {
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    let on = true;
    const load = () =>
      listMyJobs()
        .then((d) => on && setJobs(d))
        .catch(() => on && setJobs([]));
    void load();
    const t = window.setInterval(() => void load(), 4000);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, []);

  if (!jobs) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="h-8 w-32 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  const live = jobs.filter((j) => LIVE_STATUSES.includes(j.status) || j.status === "scheduled");
  const past = jobs.filter((j) => j.status === "complete" || j.status === "cancelled");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activity</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Jobs</h1>
        </div>
        <Button asChild size="sm">
          <Link to="/book">New booking</Link>
        </Button>
      </div>
      {jobs.length === 0 ? (
        <div className="mt-10 rounded-xl bg-card p-8 text-center shadow-[var(--shadow-border)]">
          <p className="font-semibold">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Book a clean or go on duty to see work here.</p>
          <Button asChild className="mt-5">
            <Link to="/book">Book now</Link>
          </Button>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">Live</h2>
              <ul className="mt-3 space-y-2">
                {live.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">Past</h2>
              <ul className="mt-3 space-y-2">
                {past.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const cleaner =
    job.cleanerId === job.customerId
      ? null
      : CLEANERS.find((c) => c.id === job.cleanerId) ??
        (job.cleanerName
          ? { name: job.cleanerName, initials: job.cleanerName.slice(0, 2).toUpperCase(), hue: 200, online: true, rating: 5, id: job.cleanerId ?? "c" }
          : null);
  const size = HOME_SIZES.find((s) => s.id === job.size)?.label;
  const service = serviceById(job.serviceId);
  const laundryMeta =
    job.serviceId === "laundry"
      ? `${job.laundryMode === "dropoff" ? "Drop-off" : "Collect"} · ${job.address}`
      : `${job.address} · ${size}`;

  return (
    <li>
      <Link
        to="/jobs/$jobId"
        params={{ jobId: job.id }}
        className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-lift)]"
      >
        {cleaner ? (
          <CleanerAvatar cleaner={cleaner} />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            OD
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{service.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{laundryMeta}</span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <Badge tone={TONE[job.status]}>{jobHeadline(job)}</Badge>
          <span className="text-sm font-medium tabular">{formatMoney(job.price + job.tip)}</span>
        </span>
      </Link>
    </li>
  );
}
