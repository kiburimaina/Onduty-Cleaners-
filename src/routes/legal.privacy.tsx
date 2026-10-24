import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/legal-page";

export const Route = createFileRoute("/legal/privacy")({
  component: () => (
    <LegalPage title="Privacy">
      <p>We keep the account you sign in with, job addresses, notes, ratings, and the last four digits of a card. We do not store full card numbers or CVV.</p>
      <h2 className="mt-6 text-lg font-semibold">Crew documents</h2>
      <p>
        If you apply to go on duty we keep your ID photo, selfie, and certificate of good conduct so staff can match your
        face to your ID. Ops sees those files. Customers only see your profile photo, name, and rating.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Location</h2>
      <p>If you tap “Use my location,” we reverse-geocode that pin to fill an address. We do not sell location trails.</p>
      <h2 className="mt-6 text-lg font-semibold">Sharing</h2>
      <p>The cleaner on a live job sees the address, notes, and your name. Ops sees jobs, disputes, and tickets to run the service.</p>
      <h2 className="mt-6 text-lg font-semibold">Retention</h2>
      <p>Receipts stay with the account. You can close the account by writing support; we keep records needed for disputes and tax.</p>
    </LegalPage>
  ),
});
