import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/legal-page";

export const Route = createFileRoute("/legal/terms")({
  component: () => (
    <LegalPage title="Terms of service">
      <p>OnDuty Cleaners is a marketplace. We match you with independent cleaners and laundry plants. We are not the employer of every crew unless a job says so.</p>
      <h2 className="mt-6 text-lg font-semibold">Bookings</h2>
      <p>A booking authorizes a hold on the card on file. We capture when the job is marked complete. Tips are optional and captured separately.</p>
      <h2 className="mt-6 text-lg font-semibold">Laundry</h2>
      <p>Tag bags. We wash, dry, and fold to garment labels. We are not liable for shrinkage, dye transfer, or items left in pockets. Report missing pieces within 48 hours of ready-for-pickup.</p>
      <h2 className="mt-6 text-lg font-semibold">Access & homes</h2>
      <p>You confirm you can authorize entry. Pets, alarms, and fragile items should be in the notes. Damage claims go through the dispute flow on the job.</p>
      <h2 className="mt-6 text-lg font-semibold">Crews</h2>
      <p>
        Crews on duty accept jobs as independent operators. Before going online, every cleaner submits a government ID, a
        live selfie, and a certificate of good conduct (police clearance). Staff reviews those files. Roster profiles are
        brand partners. Ratings are two-way.
      </p>
    </LegalPage>
  ),
});
