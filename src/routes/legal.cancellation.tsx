import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/legal-page";

export const Route = createFileRoute("/legal/cancellation")({
  component: () => (
    <LegalPage title="Cancellation">
      <p>Cancel from the job while it is searching, matched, or scheduled. The card hold is released.</p>
      <h2 className="mt-6 text-lg font-semibold">Too late</h2>
      <p>Once a cleaner is en route or a bag is in the wash, cancel is closed. Open a dispute if the visit went wrong — ops can refund.</p>
      <h2 className="mt-6 text-lg font-semibold">No-show</h2>
      <p>If a crew doesn’t arrive, cancel isn’t the lever: report the job. If you aren’t home for a collect, we wait ten minutes, then the job can be marked complete with a trip fee.</p>
      <h2 className="mt-6 text-lg font-semibold">Repeating jobs</h2>
      <p>Pause a weekly or biweekly plan from Account. The next automatic booking will not fire.</p>
    </LegalPage>
  ),
});
