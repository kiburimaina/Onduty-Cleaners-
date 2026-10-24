import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, MapPinned, Radio, Sparkles } from "lucide-react";
import { Wordmark } from "./logo-mark";
import { AuthSlot } from "./auth-slot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignedIn } from "@/lib/auth/gates";

const NAV = [
  { to: "/book", label: "Book", icon: MapPinned },
  { to: "/cleaners", label: "Crew", icon: Sparkles },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/duty", label: "On duty", icon: Radio },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="min-w-0 shrink-0" aria-label="OnDuty Cleaners home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-[color,background-color] duration-150",
                  active
                    ? "bg-secondary text-ink"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <SignedIn>
            <Link
              to="/inbox"
              className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-5" strokeWidth={1.75} />
            </Link>
            <Button asChild size="sm" className="hidden lg:inline-flex">
              <Link to="/book">Book a clean</Link>
            </Button>
          </SignedIn>
          <AuthSlot loginRedirect={pathname} />
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-4">
        {NAV.map((item) => {
          const active =
            pathname === item.to ||
            pathname.startsWith(`${item.to}/`) ||
            (item.to === "/book" && pathname === "/");
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            On-demand home cleaning and laundry. Vetted crews, live tracking, a receipt when the last surface is dry.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Service</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/book" className="hover:text-primary">
                Book now
              </Link>
            </li>
            <li>
              <Link to="/cleaners" className="hover:text-primary">
                Meet the crew
              </Link>
            </li>
            <li>
              <Link to="/apply" className="hover:text-primary">
                Join the crew
              </Link>
            </li>
            <li>
              <Link to="/duty" className="hover:text-primary">
                Go on duty
              </Link>
            </li>
            <li>
              <Link to="/support" className="hover:text-primary">
                Support
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Covered</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/legal/terms" className="hover:text-primary">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy" className="hover:text-primary">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/legal/cancellation" className="hover:text-primary">
                Cancellation
              </Link>
            </li>
            <li className="text-muted-foreground">Insured jobs · two-way ratings</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        OnDuty Cleaners · On the clock in your neighborhood
      </div>
    </footer>
  );
}

export function Shell({ children, flush = false }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className={cn("flex-1 flex flex-col pb-16 md:pb-0", flush && "pb-14 md:pb-0")}>{children}</div>
      {!flush && <SiteFooter />}
      <MobileTabBar />
    </div>
  );
}
