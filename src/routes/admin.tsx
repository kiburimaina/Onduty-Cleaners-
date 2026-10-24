import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import {
  adminGetApplication,
  adminListApplications,
  adminListJobs,
  adminReviewApplication,
  getMe,
  getPaystackSettings,
  listDisputes,
  listTickets,
  replyTicket,
  resolveDispute,
  savePaystackKeys,
  testPaystackKeys,
} from "@/lib/api";
import { jobHeadline, plantById, serviceById } from "@/lib/data";
import type { Dispute, Job, Me, Ticket, VettingDraft, VettingQueueItem } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <Shell>
      <RequireAuth>
        <AdminInner />
      </RequireAuth>
    </Shell>
  );
}

function AdminInner() {
  const [me, setMe] = useState<Me | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [queue, setQueue] = useState<VettingQueueItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [file, setFile] = useState<(VettingDraft & { userId: string }) | null>(null);
  const [note, setNote] = useState("");
  const [disputeNote, setDisputeNote] = useState("Resolved · hold released where needed.");
  const [payPublic, setPayPublic] = useState("");
  const [paySecret, setPaySecret] = useState("");
  const [payCurrency, setPayCurrency] = useState("KES");
  const [payHint, setPayHint] = useState("");
  const [payFromEnv, setPayFromEnv] = useState(false);
  const [payEnabled, setPayEnabled] = useState(false);

  function loadOps() {
    void adminListJobs().then(setJobs);
    void listDisputes().then(setDisputes);
    void listTickets().then(setTickets);
    void adminListApplications().then(setQueue);
  }

  useEffect(() => {
    void getMe().then((m) => {
      setMe(m);
      if (m.isAdmin) {
        loadOps();
        void getPaystackSettings().then((s) => {
          setPayPublic(s.publicKey);
          setPayCurrency(s.currency);
          setPayHint(s.secretSaved ? s.secretHint : "");
          setPayFromEnv(s.fromEnv);
          setPayEnabled(s.enabled);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!openId) {
      setFile(null);
      return;
    }
    void adminGetApplication({ data: { userId: openId } }).then(setFile);
  }, [openId]);

  if (!me) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  if (!me.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Staff only</h1>
        <p className="mt-2 text-sm text-muted-foreground">The first account on a new OnDuty site is the operator.</p>
        <Button asChild className="mt-6">
          <Link to="/account">Back</Link>
        </Button>
      </div>
    );
  }

  const waiting = queue.filter((q) => q.status === "pending").length;

  function review(decision: "approved" | "rejected" | "needs_info") {
    if (!openId) return;
    void adminReviewApplication({ data: { userId: openId, decision, note } })
      .then(() => {
        toast(decision === "approved" ? "Cleared to go on duty" : decision === "needs_info" ? "Asked for more" : "Rejected");
        setOpenId(null);
        setNote("");
        loadOps();
      })
      .catch((e: Error) => toast(e.message));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ops</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Staff console</h1>

      <section className="mt-8 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Paystack test keys</h2>
          <Badge tone={payEnabled ? "success" : "muted"}>{payEnabled ? "Test mode on" : "Not connected"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          From the Paystack dashboard: Settings → API Keys & Webhooks. Paste the test pair only (pk_test_ and sk_test_).
          The secret is stored on the server and is not shown again. Live keys are rejected.
        </p>
        {payFromEnv && (
          <p className="mt-3 text-sm">Keys are set in the server environment and override this form.</p>
        )}
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void savePaystackKeys({ data: { publicKey: payPublic, secretKey: paySecret, currency: payCurrency } })
              .then(() => {
                setPaySecret("");
                toast("Test keys saved");
                return getPaystackSettings();
              })
              .then((s) => {
                setPayPublic(s.publicKey);
                setPayHint(s.secretHint);
                setPayEnabled(s.enabled);
              })
              .catch((err: Error) => toast(err.message));
          }}
        >
          <div>
            <Label htmlFor="pk">Test public key</Label>
            <Input
              id="pk"
              className="mt-1.5"
              value={payPublic}
              onChange={(e) => setPayPublic(e.target.value.trim())}
              placeholder="pk_test_…"
              autoComplete="off"
              disabled={payFromEnv}
              required
            />
          </div>
          <div>
            <Label htmlFor="sk">Test secret key</Label>
            <Input
              id="sk"
              className="mt-1.5"
              type="password"
              value={paySecret}
              onChange={(e) => setPaySecret(e.target.value.trim())}
              placeholder={payHint ? `Saved ${payHint} — paste only to replace` : "sk_test_…"}
              autoComplete="new-password"
              disabled={payFromEnv}
            />
          </div>
          <div>
            <Label htmlFor="cur">Charge currency</Label>
            <select
              id="cur"
              className="mt-1.5 h-11 w-full rounded-md bg-background px-3 text-sm shadow-[var(--shadow-border)]"
              value={payCurrency}
              disabled={payFromEnv}
              onChange={(e) => setPayCurrency(e.target.value)}
            >
              {["KES", "NGN", "GHS", "ZAR", "USD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={payFromEnv}>
              Save test keys
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!payEnabled}
              onClick={() => {
                void testPaystackKeys()
                  .then(() => toast("Paystack accepted the test secret"))
                  .catch((err: Error) => toast(err.message));
              }}
            >
              Test connection
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Test card 4084 0840 8408 4081 · any future expiry · CVV 408 · PIN 0000 · OTP 123456. No real money moves.
          Quotes are charged in the currency above (the quote number, in that currency).
        </p>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Crew checks</h2>
          {waiting > 0 && <Badge tone="primary">{waiting} waiting</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Match selfie to ID. Confirm the certificate of good conduct is in date. Nobody goes online until you approve.
        </p>
        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {queue.map((q) => (
              <li key={q.userId}>
                <button
                  type="button"
                  onClick={() => setOpenId(q.userId === openId ? null : q.userId)}
                  className="flex w-full items-center justify-between rounded-xl bg-card p-4 text-left shadow-[var(--shadow-border)]"
                >
                  <span>
                    <span className="block font-semibold">{q.legalName || "Unnamed"}</span>
                    <span className="text-sm text-muted-foreground">
                      {q.city || "No city"} · {q.phone || "No phone"}
                    </span>
                  </span>
                  <Badge tone={q.status === "approved" ? "success" : q.status === "pending" ? "primary" : "muted"}>
                    {q.status.replace("_", " ")}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {file && (
          <div className="mt-4 space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <div>
              <p className="text-lg font-semibold">{file.legalName}</p>
              <p className="text-sm text-muted-foreground">
                {file.city} · born {file.dob || "—"} · {file.idType.replace("_", " ")} {file.idNumber} · expires {file.idExpiry || "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Good conduct issued {file.conductIssued || "—"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DocShot label="Profile" src={file.profilePhoto} />
              <DocShot label="Selfie — match to ID" src={file.selfie} />
              <DocShot label="ID front" src={file.idFront} />
              <DocShot label="ID back" src={file.idBack} />
              <DocShot label="Good conduct" src={file.goodConduct} className="sm:col-span-2" />
            </div>
            <div>
              <Label htmlFor="staff-note">Note to applicant</Label>
              <Input
                id="staff-note"
                className="mt-1.5"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional — required if you ask for more"
              />
            </div>
            {file.status !== "approved" && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => review("approved")}>Approve — can go on duty</Button>
                <Button variant="outline" onClick={() => review("needs_info")}>
                  Need a clearer file
                </Button>
                <Button variant="outline" onClick={() => review("rejected")}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Disputes</h2>
        {disputes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None open.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {disputes.map((d) => (
              <li key={d.id} className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold capitalize">{d.reason}</p>
                  <Badge tone={d.status === "resolved" ? "success" : "primary"}>{d.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.detail || "No detail"}</p>
                {d.status !== "resolved" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} />
                    <Button
                      size="sm"
                      onClick={() => {
                        void resolveDispute({ data: { id: d.id, resolution: disputeNote, refund: true } }).then(() => {
                          toast("Resolved with refund");
                          void listDisputes().then(setDisputes);
                        });
                      }}
                    >
                      Refund & close
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Tickets</h2>
        <ul className="mt-3 space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
              <p className="font-semibold">{t.subject}</p>
              <p className="text-sm capitalize text-muted-foreground">{t.status}</p>
              <Button
                size="sm"
                className="mt-3"
                variant="outline"
                onClick={() => {
                  void replyTicket({ data: { ticketId: t.id, body: "We're on it — a lead will follow up." } }).then(() => {
                    toast("Replied");
                    void listTickets().then(setTickets);
                  });
                }}
              >
                Send ops reply
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Wash floor</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bags moving through the plants. Drop-off, collect, and delivery share this board.</p>
        {jobs.filter((j) => j.serviceId === "laundry" && j.status !== "complete" && j.status !== "cancelled").length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No bags in the shop.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {jobs
              .filter((j) => j.serviceId === "laundry" && j.status !== "complete" && j.status !== "cancelled")
              .map((job) => (
                <li key={job.id}>
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: job.id }}
                    className="flex items-center justify-between rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
                  >
                    <span>
                      <span className="block font-semibold">{plantById(job.plantId).name}</span>
                      <span className="text-sm text-muted-foreground">
                        {job.customerName} · {job.offer === "dryclean" ? "Dry clean" : job.laundryMode}
                      </span>
                    </span>
                    <Badge>{jobHeadline(job)}</Badge>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <ul className="mt-3 space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="flex items-center justify-between rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
              >
                <span>
                  <span className="block font-semibold">{serviceById(job.serviceId).name}</span>
                  <span className="text-sm text-muted-foreground">
                    {job.customerName} · {job.address}
                  </span>
                </span>
                <span className="text-right">
                  <Badge>{jobHeadline(job)}</Badge>
                  <span className="mt-1 block text-sm tabular">{formatMoney(job.price)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DocShot({ label, src, className }: { label: string; src: string; className?: string }) {
  return (
    <figure className={className}>
      <figcaption className="mb-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</figcaption>
      {src ? (
        <img src={src} alt={label} className="max-h-56 w-full rounded-lg object-cover shadow-[var(--shadow-border)]" />
      ) : (
        <div className="grid h-28 place-items-center rounded-lg bg-secondary text-sm text-muted-foreground">Missing</div>
      )}
    </figure>
  );
}
