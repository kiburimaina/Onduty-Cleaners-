import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createTicket, listTickets, replyTicket } from "@/lib/api";
import type { Ticket } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({ component: SupportPage });

function SupportPage() {
  return (
    <Shell>
      <RequireAuth>
        <SupportInner />
      </RequireAuth>
    </Shell>
  );
}

function SupportInner() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  function refresh() {
    void listTickets().then(setTickets);
  }

  useEffect(() => {
    refresh();
  }, []);

  const active = tickets.find((t) => t.id === openId) ?? null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Help</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Support</h1>
      <p className="mt-2 text-sm text-muted-foreground">Lost bags, access issues, billing. We reply in-thread.</p>

      <form
        className="mt-8 space-y-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          void createTicket({ data: { subject, body } }).then((r) => {
            toast("Ticket opened");
            setSubject("");
            setBody("");
            setOpenId(r.id);
            refresh();
          });
        }}
      >
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="body">What happened</Label>
          <Textarea id="body" className="mt-1.5" value={body} onChange={(e) => setBody(e.target.value)} required />
        </div>
        <Button type="submit">Send</Button>
      </form>

      <ul className="mt-8 space-y-2">
        {tickets.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setOpenId(t.id === openId ? null : t.id)}
              className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-left shadow-[var(--shadow-border)]"
            >
              <span>
                <span className="block font-semibold">{t.subject}</span>
                <span className="text-sm capitalize text-muted-foreground">{t.status}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div className="mt-6 space-y-3 rounded-xl bg-background p-4">
          {active.messages.map((m) => (
            <p key={m.id} className="text-sm">
              <span className="font-semibold">{m.fromOps ? "OnDuty" : "You"} · </span>
              {m.body}
            </p>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void replyTicket({ data: { ticketId: active.id, body: reply } }).then(() => {
                setReply("");
                refresh();
              });
            }}
          >
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" required />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}
    </div>
  );
}
