import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { CleanerAvatar } from "@/components/layout/avatar";
import { Badge } from "@/components/ui/badge";
import { CLEANERS, SERVICES } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/cleaners/")({ component: CleanersPage });

function CleanersPage() {
  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Crew</p>
        <h1 className="mt-1 max-w-xl text-3xl font-semibold text-ink sm:text-4xl">
          People with names, ratings, and a van already in the neighborhood.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          Every cleaner on OnDuty is background-checked and insured. You can auto-match, or book a specific person.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLEANERS.map((c) => (
            <li key={c.id}>
              <Link
                to="/cleaners/$cleanerId"
                params={{ cleanerId: c.id }}
                className="flex h-full flex-col rounded-xl bg-card p-5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start gap-3">
                  <CleanerAvatar cleaner={c} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold">{c.name}</h2>
                      {c.online ? <Badge tone="success">On duty</Badge> : <Badge>Off</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="size-3.5 fill-primary text-primary" />
                      <span className="tabular font-medium text-foreground">{c.rating.toFixed(2)}</span>
                      <span>· {c.jobs.toLocaleString()} jobs</span>
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.bio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.specialties.map((id) => (
                    <Badge key={id} tone="silver">
                      {SERVICES.find((s) => s.id === id)?.name}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.city}</span>
                  <span className="font-semibold tabular">
                    {c.online ? `${c.etaMin} min · ` : ""}
                    {formatMoney(c.rate)}/hr
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
