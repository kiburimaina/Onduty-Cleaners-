import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, Star } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { CleanerAvatar } from "@/components/layout/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLEANERS, SERVICES } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/cleaners/$cleanerId")({ component: CleanerProfile });

function CleanerProfile() {
  const { cleanerId } = Route.useParams();
  const navigate = useNavigate();
  const setDraft = useAppStore((s) => s.setDraft);
  const cleaner = CLEANERS.find((c) => c.id === cleanerId);

  if (!cleaner) {
    return (
      <Shell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Cleaner not found</h1>
          <Button asChild className="mt-6">
            <Link to="/cleaners">Back to crew</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-border)]">
          <CleanerAvatar cleaner={cleaner} size="xl" />
          <h1 className="mt-4 text-3xl font-semibold text-ink">{cleaner.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="size-4 fill-primary text-primary" />
            <span className="tabular font-semibold text-foreground">{cleaner.rating.toFixed(2)}</span>
            <span>· {cleaner.jobs.toLocaleString()} jobs · {cleaner.years} yrs</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {cleaner.online ? <Badge tone="success">On duty · {cleaner.etaMin} min</Badge> : <Badge>Off duty</Badge>}
            <Badge tone="silver">
              <Shield className="size-3" /> Insured
            </Badge>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-background p-3">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Rate</dt>
              <dd className="mt-1 font-semibold tabular">{formatMoney(cleaner.rate)}/hr</dd>
            </div>
            <div className="rounded-lg bg-background p-3">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Area</dt>
              <dd className="mt-1 font-semibold">{cleaner.city}</dd>
            </div>
          </dl>
          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!cleaner.online}
            onClick={() => {
              setDraft({ cleanerId: cleaner.id, serviceId: cleaner.specialties[0] ?? "standard" });
              void navigate({ to: "/book" });
            }}
          >
            {cleaner.online ? `Book ${cleaner.name.split(" ")[0]}` : "Currently off duty"}
          </Button>
        </aside>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">About</h2>
          <p className="mt-3 text-base leading-relaxed text-foreground">{cleaner.bio}</p>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Specialties</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {cleaner.specialties.map((id) => {
              const s = SERVICES.find((x) => x.id === id);
              if (!s) return null;
              return (
                <li key={id} className="rounded-lg bg-card p-4 shadow-[var(--shadow-border)]">
                  <p className="font-semibold">{s.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
                </li>
              );
            })}
          </ul>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Languages</h2>
          <p className="mt-2 text-sm">{cleaner.languages.join(" · ")}</p>
        </div>
      </div>
    </Shell>
  );
}
