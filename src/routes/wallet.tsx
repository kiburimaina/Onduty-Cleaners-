import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getMe, listPayments, paystackReady, saveWallet } from "@/lib/api";
import type { Me, Payment } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  return (
    <Shell>
      <RequireAuth>
        <WalletInner />
      </RequireAuth>
    </Shell>
  );
}

function WalletInner() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [brand, setBrand] = useState("visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState(12);
  const [expYear, setExpYear] = useState(2028);
  const [paystack, setPaystack] = useState(false);
  const [payCurrency, setPayCurrency] = useState("KES");

  useEffect(() => {
    void getMe().then((m) => {
      setMe(m);
      if (m.wallet) {
        setBrand(m.wallet.brand);
        setLast4(m.wallet.last4);
        setExpMonth(m.wallet.expMonth);
        setExpYear(m.wallet.expYear);
      }
    });
    void listPayments().then(setPayments);
    void paystackReady()
      .then((r) => {
        setPaystack(r.enabled);
        setPayCurrency(r.currency);
      })
      .catch(() => setPaystack(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Billing</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Wallet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {paystack
          ? `Paystack test mode is on. Booking opens Paystack in ${payCurrency}. No card number is stored here.`
          : "We store brand, last four, and expiry only. Never the full number. Jobs authorize on book and capture when complete."}
      </p>

      {me?.wallet && (
        <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-sm">
          On file · {me.wallet.brand} ···· {me.wallet.last4}
        </p>
      )}

      <form
        className="mt-6 space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          void saveWallet({ data: { brand, last4, expMonth, expYear } })
            .then(() => {
              toast("Card saved");
              void navigate({ to: "/book" });
            })
            .catch((err: Error) => toast(err.message));
        }}
      >
        <div>
          <Label>Brand</Label>
          <div className="mt-1.5 flex gap-2">
            {["visa", "mastercard", "amex"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={cn(
                  "h-11 flex-1 rounded-full text-sm capitalize",
                  brand === b ? "bg-primary text-primary-foreground" : "bg-secondary",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="last4">Last four digits</Label>
          <Input
            id="last4"
            className="mt-1.5"
            inputMode="numeric"
            maxLength={4}
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4242"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="month">Exp month</Label>
            <Input
              id="month"
              className="mt-1.5"
              type="number"
              min={1}
              max={12}
              value={expMonth}
              onChange={(e) => setExpMonth(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="year">Exp year</Label>
            <Input
              id="year"
              className="mt-1.5"
              type="number"
              min={2026}
              value={expYear}
              onChange={(e) => setExpYear(Number(e.target.value))}
            />
          </div>
        </div>
        <Button type="submit" className="w-full">
          Save card
        </Button>
      </form>

      {payments.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Receipts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between rounded-lg bg-card px-4 py-3 shadow-[var(--shadow-border)]">
                <span className="capitalize text-muted-foreground">
                  {p.status}
                  {p.last4 ? ` · ${p.brand} ${p.last4}` : ""}
                </span>
                <span className="tabular font-medium">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button asChild variant="ghost" className="mt-8">
        <Link to="/account">Back to account</Link>
      </Button>
    </div>
  );
}
