import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { listNotifications, markNotificationsRead } from "@/lib/api";
import type { Notice } from "@/lib/types";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  return (
    <Shell>
      <RequireAuth>
        <InboxInner />
      </RequireAuth>
    </Shell>
  );
}

function InboxInner() {
  const [items, setItems] = useState<Notice[] | null>(null);

  useEffect(() => {
    void listNotifications().then((n) => {
      setItems(n);
      void markNotificationsRead();
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alerts</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Inbox</h1>
      {!items ? (
        <div className="mt-8 h-24 animate-pulse rounded-xl bg-secondary" />
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Quiet for now. Job updates land here.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              {n.jobId ? (
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: n.jobId }}
                  className="block rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
                >
                  <span className="block font-semibold">{n.title}</span>
                  <span className="text-sm text-muted-foreground">{n.body}</span>
                </Link>
              ) : (
                <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="ghost" className="mt-8">
        <Link to="/account">Account</Link>
      </Button>
    </div>
  );
}
