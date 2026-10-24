import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

function AuthSkeleton() {
  return <div className="size-8 shrink-0 animate-pulse rounded-full bg-secondary" />;
}

export function AuthSlot({ loginRedirect = "/book" }: { loginRedirect?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending) return <AuthSkeleton />;
  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/login" search={{ redirect: loginRedirect }}>
          Sign in
        </Link>
      </Button>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
        <Link to="/account">Account</Link>
      </Button>
      <UserButton />
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
