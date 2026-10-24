import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Clock, Shield, Star } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { LogoMark } from "@/components/layout/logo-mark";
import { CleanerAvatar } from "@/components/layout/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLEANERS, SERVICES, STEPS, TRUST } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const featured = CLEANERS.filter((c) => c.online).slice(0, 5);

  return (
    <Shell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d5e8f2,_transparent_58%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge tone="primary" className="mb-5">
              <span className="size-1.5 rounded-full bg-success" />
              18 crews on duty nearby
            </Badge>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
              A cleaner at your door — like calling a ride.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              OnDuty is on-demand home cleaning. Drop a pin, match a vetted crew in minutes, watch them arrive.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="xl">
                <Link to="/book">
                  Book a clean
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/cleaners">Meet the crew</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Laundry and dry clean too — drop off, collect, or we deliver it back.{" "}
              <Link to="/book" search={{ service: "laundry" }} className="font-medium text-primary">
                Book laundry
              </Link>
            </p>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border/80 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Typical ETA</dt>
                <dd className="mt-1 text-2xl font-semibold tabular text-ink">8 min</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Avg rating</dt>
                <dd className="mt-1 text-2xl font-semibold tabular text-ink">4.96</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Jobs done</dt>
                <dd className="mt-1 text-2xl font-semibold tabular text-ink">12k+</dd>
              </div>
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl" />
            <LogoMark className="relative mx-auto aspect-square w-full max-w-sm" />
            <div className="absolute -bottom-3 left-1/2 flex w-[min(100%,20rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-card p-3 shadow-[var(--shadow-lift)]">
              <CleanerAvatar cleaner={CLEANERS[0]!} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{CLEANERS[0]!.name}</p>
                <p className="text-xs text-muted-foreground">En route · 6 min</p>
              </div>
              <span className="ml-auto text-sm font-semibold tabular text-primary">Live</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
        <h2 className="mt-2 max-w-lg text-3xl font-semibold text-ink">Three steps. Then someone is on the way.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
              <span className="text-sm font-semibold tabular text-primary">{step.n}</span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Services</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink">Whatever the mess, a crew for it.</h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/book">
                See pricing
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link
                key={s.id}
                to="/book"
                search={{ service: s.id }}
                className="group overflow-hidden rounded-xl bg-background shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={s.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <span className="text-sm font-medium tabular text-primary">
                      {formatMoney(s.rate)}{s.unit === "bag" ? "+" : "/hr"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {s.durationLabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">On duty now</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Named people, not a black box.</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/cleaners">
              All cleaners
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {featured.map((c) => (
            <li key={c.id}>
              <Link
                to="/cleaners/$cleanerId"
                params={{ cleanerId: c.id }}
                className="flex h-full flex-col rounded-xl bg-card p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-lift)]"
              >
                <CleanerAvatar cleaner={c} size="lg" />
                <p className="mt-3 font-semibold">{c.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-primary text-primary" />
                  <span className="tabular font-medium text-foreground">{c.rating.toFixed(2)}</span>
                  <span>· {c.etaMin} min</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border/70 bg-ink text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title}>
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-silver">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-[28px] bg-card shadow-[var(--shadow-border)] md:grid md:grid-cols-2">
          <img src="/images/tools.jpg" alt="OnDuty cleaning kit" className="h-64 w-full object-cover md:h-full" />
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">For crews</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Go on duty. Jobs come to you.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Set yourself online, accept a ping, navigate to the door. Same rails the customer sees — just the other seat.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-primary" /> Keep 78% of the job
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Instant payouts after rating
              </li>
              <li className="flex items-center gap-2">
                <Shield className="size-4 text-primary" /> Insurance on every booking
              </li>
            </ul>
            <Button asChild className="mt-8 w-fit" variant="ink">
              <Link to="/duty">Open duty mode</Link>
            </Button>
          </div>
        </div>
      </section>
    </Shell>
  );
}
