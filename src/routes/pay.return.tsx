import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { finishPaystackCheckout } from "@/lib/api";

const searchSchema = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/pay/return")({
  validateSearch: searchSchema,
  component: PayReturnPage,
});

function PayReturnPage() {
  return (
    <Shell>
      <RequireAuth>
        <PayReturnInner />
      </RequireAuth>
    </Shell>
  );
}

function PayReturnInner() {
  const { reference, trxref } = Route.useSearch();
  const ref = reference || trxref || "";
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ref) {
      setError("Missing payment reference");
      return;
    }
    void finishPaystackCheckout({ data: { reference: ref } })
      .then((job) => {
        void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
      })
      .catch((err: Error) => setError(err.message));
  }, [ref, navigate]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Paystack</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">{error ? "Payment not confirmed" : "Confirming payment"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error || "Checking the test charge with Paystack…"}</p>
    </div>
  );
}
