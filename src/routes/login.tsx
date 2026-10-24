import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { LogoMark, Wordmark } from "@/components/layout/logo-mark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const callbackURL = redirect && redirect.startsWith("/") ? redirect : "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      try {
        await authClient.getSession();
      } catch {
        /* session store will recover */
      }
      void navigate({ to: callbackURL as "/" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <LogoMark className="size-12" />
          <Wordmark />
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Sign in to OnDuty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Customers book. Crews go on duty. Same account, two seats.
        </p>
        {authEnabled ? (
          <div className="mt-6 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void signIn(p.providerId, { callbackURL })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}
        {authEnabled && (
          <>
            <p className="my-5 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">or email</p>
            <form className="space-y-3" onSubmit={(e) => void onEmail(e)}>
              {mode === "up" && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  className="mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 h-11 w-full text-sm text-muted-foreground"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </>
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <Link to="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/legal/privacy" className="underline">
            Privacy
          </Link>{" "}
          policies.
        </p>
      </div>
    </main>
  );
}
