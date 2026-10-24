import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getEarnings, requestPayout, savePayoutPhone } from "@/lib/api";
import type { Earnings } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/earnings")({ component: EarningsPage });

function EarningsPage() {
  return (
    <Shell>
      <RequireAuth>
        <EarningsInner />
      </RequireAuth>
    </Shell>
  );
}

function EarningsInner() {
  const [data, setData] = useState<Earnings | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    void getEarnings().then((d) => {
      setData(d);
      setPhone(d.phone);
    });
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Crew</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Earnings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You keep 78% of the fare plus the whole tip. Cash out to mobile money when you're ready.
      </p>

      <div className="mt-6 rounded-xl bg-ink p-5 text-primary-foreground">
        <p className="text-xs uppercase tracking-[0.14em] text-silver">Available</p>
        <p className="mt-1 text-4xl font-semibold tabular">{formatMoney(data.balance)}</p>
        <p className="mt-2 text-sm text-silver">Paid out {formatMoney(data.paid)}</p>
      </div>

      <form
        className="mt-6 space-y-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void savePayoutPhone({ data: { phone } })
            .then(() => requestPayout())
            .then((r) => {
              toast(`Sent ${formatMoney(r.amount)}`);
              load();
            })
            .catch((err: Error) => toast(err.message))
            .finally(() => setBusy(false));
        }}
      >
        <div>
          <Label htmlFor="momo">Mobile money number</Label>
          <Input
            id="momo"
            className="mt-1.5"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07…"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || data.balance < 1}>
          {busy ? "Sending…" : `Cash out ${formatMoney(data.balance)}`}
        </Button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Trips</h2>
        {data.lines.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Finished jobs you took show up here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.lines.map((line) => (
              <li key={line.jobId}>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: line.jobId }}
                  className="flex items-center justify-between rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{line.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(line.at).toLocaleDateString()}
                      {line.tip > 0 ? ` · tip ${formatMoney(line.tip)}` : ""}
                    </span>
                  </span>
                  <span className="tabular font-semibold">{formatMoney(line.fare + line.tip)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.payouts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Payouts</h2>
          <ul className="mt-3 space-y-2">
            {data.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-card p-4 text-sm shadow-[var(--shadow-border)]">
                <span>
                  <span className="block font-semibold">{p.phone}</span>
                  <span className="text-muted-foreground">{new Date(p.at).toLocaleString()}</span>
                </span>
                <span className="tabular font-semibold">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
