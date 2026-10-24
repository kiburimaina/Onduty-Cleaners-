import { Link } from "@tanstack/react-router";
import { Shell } from "./site-header";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Shell>
      <article className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">{title}</h1>
        <div className="mt-8 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
        <p className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link to="/legal/terms" className="text-primary">
            Terms
          </Link>
          <Link to="/legal/privacy" className="text-primary">
            Privacy
          </Link>
          <Link to="/legal/cancellation" className="text-primary">
            Cancellation
          </Link>
        </p>
      </article>
    </Shell>
  );
}
