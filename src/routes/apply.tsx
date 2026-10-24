import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, IdCard, Shield, UserRound } from "lucide-react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { PhotoField } from "@/components/vetting/photo-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { getMyVetting, saveVettingDraft, submitVetting } from "@/lib/api";
import type { IdType, VettingDraft, VettingStatus } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/apply")({ component: ApplyPage });

const STEPS = ["You", "Face", "ID", "Conduct", "Selfie", "Review"] as const;

const ID_TYPES: { id: IdType; label: string }[] = [
  { id: "national_id", label: "National ID" },
  { id: "passport", label: "Passport" },
  { id: "driving_license", label: "Driving licence" },
];

function emptyDraft(): VettingDraft {
  return {
    legalName: "",
    phone: "",
    city: "",
    dob: "",
    idType: "national_id",
    idNumber: "",
    idExpiry: "",
    conductIssued: "",
    profilePhoto: "",
    idFront: "",
    idBack: "",
    goodConduct: "",
    selfie: "",
    status: "none",
    staffNote: "",
    submittedAt: null,
  };
}

function ApplyPage() {
  return (
    <Shell>
      <RequireAuth>
        <ApplyInner />
      </RequireAuth>
    </Shell>
  );
}

function statusCopy(status: VettingStatus) {
  switch (status) {
    case "pending":
      return "Staff is matching your selfie to your ID and checking the good-conduct certificate. This is usually same day.";
    case "approved":
      return "You're cleared. Go on duty when you're ready to take jobs.";
    case "needs_info":
      return "Staff needs a clearer file. Fix what's listed, then send it back.";
    case "rejected":
      return "This application was not approved. You can submit again with the right documents.";
    default:
      return "Same checks Uber runs on drivers: a live face, a government ID, and a certificate of good conduct. Nobody goes online until staff signs off.";
  }
}

function ApplyInner() {
  const [draft, setDraft] = useState<VettingDraft>(emptyDraft());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [attest, setAttest] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getMyVetting()
      .then((d) => {
        setDraft(d);
        if (d.status === "pending" || d.status === "approved") setStep(5);
      })
      .catch(() => {
        /* form still works if the draft hasn't been saved yet */
      })
      .finally(() => setLoaded(true));
  }, []);

  const locked = draft.status === "pending" || draft.status === "approved";

  function patch(partial: Partial<VettingDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function save(next?: Partial<VettingDraft>) {
    const payload = { ...draft, ...next };
    setDraft(payload);
    if (locked) return payload;
    try {
      const saved = await saveVettingDraft({
        data: {
          legalName: payload.legalName,
          phone: payload.phone,
          city: payload.city,
          dob: payload.dob,
          idType: payload.idType,
          idNumber: payload.idNumber,
          idExpiry: payload.idExpiry,
          conductIssued: payload.conductIssued,
          profilePhoto: payload.profilePhoto,
          idFront: payload.idFront,
          idBack: payload.idBack,
          goodConduct: payload.goodConduct,
          selfie: payload.selfie,
        },
      });
      setDraft(saved);
      return saved;
    } catch {
      return payload;
    }
  }

  function go(n: number) {
    void save();
    setStep(n);
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="h-8 w-48 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Crew checks</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Work with OnDuty</h1>
      <p className="mt-2 text-sm text-muted-foreground">{statusCopy(draft.status)}</p>

      {draft.status !== "none" && draft.status !== "draft" && (
        <div className="mt-4">
          <Badge tone={draft.status === "approved" ? "success" : draft.status === "pending" ? "primary" : "muted"}>
            {draft.status.replace("_", " ")}
          </Badge>
        </div>
      )}
      {draft.staffNote && draft.status !== "pending" && draft.status !== "approved" && (
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">{draft.staffNote}</p>
      )}

      <ol className="mt-6 grid grid-cols-6 gap-1">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => go(i)}
              className={`h-1.5 w-full rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
              aria-label={label}
            />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {step + 1} / {STEPS.length} · {STEPS[step]}
      </p>

      <div className="mt-6 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        {step === 0 && (
          <div className="space-y-4">
            <p className="font-semibold">Legal name, as on your ID</p>
            <div>
              <Label htmlFor="legal">Full name</Label>
              <Input
                id="legal"
                className="mt-1.5"
                value={draft.legalName}
                disabled={locked}
                onChange={(e) => patch({ legalName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Mobile</Label>
              <Input
                id="phone"
                className="mt-1.5"
                value={draft.phone}
                disabled={locked}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="07…"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="mt-1.5"
                value={draft.city}
                disabled={locked}
                onChange={(e) => patch({ city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                className="mt-1.5"
                value={draft.dob}
                disabled={locked}
                onChange={(e) => patch({ dob: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Must be 18 or older.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-semibold">Profile photo</p>
                <p className="text-sm text-muted-foreground">Face clear, no sunglasses, even light. Customers see this on the job.</p>
              </div>
            </div>
            <PhotoField
              label="Face photo"
              hint="Look at the camera. Shoulders up."
              capture="user"
              value={draft.profilePhoto}
              onChange={(profilePhoto) => {
                patch({ profilePhoto });
                void save({ profilePhoto });
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <IdCard className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-semibold">Government ID</p>
                <p className="text-sm text-muted-foreground">National ID, passport, or driving licence. All four corners in the frame.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ID_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={locked}
                  onClick={() => patch({ idType: t.id })}
                  className={`h-11 rounded-full px-4 text-sm font-medium ${
                    draft.idType === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="idn">ID number</Label>
              <Input
                id="idn"
                className="mt-1.5"
                value={draft.idNumber}
                disabled={locked}
                onChange={(e) => patch({ idNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="exp">Expires</Label>
              <Input
                id="exp"
                type="date"
                className="mt-1.5"
                value={draft.idExpiry}
                disabled={locked}
                onChange={(e) => patch({ idExpiry: e.target.value })}
              />
            </div>
            <PhotoField
              label="Front of ID"
              hint="No glare. Name and photo readable."
              capture="environment"
              value={draft.idFront}
              onChange={(idFront) => {
                patch({ idFront });
                void save({ idFront });
              }}
            />
            {draft.idType !== "passport" && (
              <PhotoField
                label="Back of ID"
                hint="Optional for passports."
                capture="environment"
                value={draft.idBack}
                onChange={(idBack) => {
                  patch({ idBack });
                  void save({ idBack });
                }}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-semibold">Certificate of good conduct</p>
                <p className="text-sm text-muted-foreground">
                  Police clearance / DCI certificate of good conduct. Issued in the last 12 months.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="issued">Issued on</Label>
              <Input
                id="issued"
                type="date"
                className="mt-1.5"
                value={draft.conductIssued}
                disabled={locked}
                onChange={(e) => patch({ conductIssued: e.target.value })}
              />
            </div>
            <PhotoField
              label="Certificate photo"
              hint="Whole page, serial number readable."
              capture="environment"
              value={draft.goodConduct}
              onChange={(goodConduct) => {
                patch({ goodConduct });
                void save({ goodConduct });
              }}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="font-semibold">Live selfie</p>
            <p className="text-sm text-muted-foreground">
              Staff compares this to the ID photo. Neutral face, no filter, no hat.
            </p>
            <PhotoField
              label="Selfie"
              hint="Hold the phone at eye level."
              capture="user"
              value={draft.selfie}
              onChange={(selfie) => {
                patch({ selfie });
                void save({ selfie });
              }}
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="font-semibold">Send to staff</p>
            <ul className="space-y-2 text-sm">
              {[
                ["Name", draft.legalName],
                ["Phone", draft.phone],
                ["City", draft.city],
                ["ID", `${ID_TYPES.find((t) => t.id === draft.idType)?.label ?? ""} · ${draft.idNumber}`],
                ["Face photo", draft.profilePhoto ? "Attached" : "Missing"],
                ["ID photo", draft.idFront ? "Attached" : "Missing"],
                ["Good conduct", draft.goodConduct ? "Attached" : "Missing"],
                ["Selfie", draft.selfie ? "Attached" : "Missing"],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 border-b border-border/70 py-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{v || "Not set"}</span>
                </li>
              ))}
            </ul>
            {!locked && (
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={attest}
                  onChange={(e) => setAttest(e.target.checked)}
                />
                <span>
                  These documents are mine. I consent to staff reviewing my identity, photo, and certificate of good
                  conduct before I can go on duty.
                </span>
              </label>
            )}
            {draft.status === "approved" && (
              <Button asChild className="w-full">
                <Link to="/duty">
                  <BadgeCheck className="size-4" />
                  Go on duty
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => go(step - 1)}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          )}
          {step < 5 && (
            <Button
              type="button"
              className="flex-1"
              onClick={() => go(step + 1)}
            >
              Continue
            </Button>
          )}
          {step === 5 && !locked && (
            <Button
              type="button"
              className="flex-1"
              disabled={!attest || busy}
              onClick={() => {
                setBusy(true);
                void submitVetting({
                  data: {
                    legalName: draft.legalName,
                    phone: draft.phone,
                    city: draft.city,
                    dob: draft.dob,
                    idType: draft.idType,
                    idNumber: draft.idNumber,
                    idExpiry: draft.idExpiry,
                    conductIssued: draft.conductIssued,
                    profilePhoto: draft.profilePhoto,
                    idFront: draft.idFront,
                    idBack: draft.idBack,
                    goodConduct: draft.goodConduct,
                    selfie: draft.selfie,
                  },
                })
                  .then((d) => {
                    setDraft(d);
                    toast("Sent to staff");
                  })
                  .catch((e: Error) => toast(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              Submit for review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
