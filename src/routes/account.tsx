import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/site-header";
import { RequireAuth } from "@/components/layout/auth-slot";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { deletePlace, getMe, listPlaces, listRecurring, savePlace, toggleRecurring, updateProfile } from "@/lib/api";
import { serviceById } from "@/lib/data";
import type { Me, Place, RecurringPlan } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  return (
    <Shell>
      <RequireAuth>
        <AccountInner />
      </RequireAuth>
    </Shell>
  );
}

function AccountInner() {
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeLabel, setPlaceLabel] = useState("Home");
  const [placeAddress, setPlaceAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    void getMe().then((m) => {
      setMe(m);
      setName(m.profile.name);
      setPhone(m.profile.phone);
      setAddress(m.profile.address);
    });
    void listRecurring().then(setPlans);
    void listPlaces().then(setPlaces);
  }, []);

  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">You</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">Account</h1>
      <p className="mt-2 text-sm text-muted-foreground capitalize">
        {me.profile.role}
        {me.isAdmin ? " · staff" : ""}
      </p>

      <form
        className="mt-8 space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          void updateProfile({ data: { name, phone, address } }).then(() => toast("Saved"));
        }}
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="address">Home address</Label>
          <Input id="address" className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="submit">Save</Button>
      </form>

      <div className="mt-6 grid gap-2">
        <Button asChild variant="outline">
          <Link to="/wallet">Payment method</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/earnings">Crew earnings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/inbox">Notifications</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/support">Support</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/apply">Crew checks</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/duty">{me.cleared ? "On duty" : "Join the crew"}</Link>
        </Button>
        {me.isAdmin && (
          <Button asChild>
            <Link to="/admin">Staff console</Link>
          </Button>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Saved places</h2>
        <p className="mt-1 text-sm text-muted-foreground">Home, office, or the flat you book most. They show up when you book.</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void savePlace({ data: { label: placeLabel, address: placeAddress } })
              .then(() => listPlaces())
              .then((list) => {
                setPlaces(list);
                setPlaceAddress("");
                toast("Place saved");
              })
              .catch((err: Error) => toast(err.message));
          }}
        >
          <Input value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} placeholder="Home" aria-label="Place name" />
          <Input
            className="sm:flex-1"
            value={placeAddress}
            onChange={(e) => setPlaceAddress(e.target.value)}
            placeholder="Street address"
            aria-label="Place address"
          />
          <Button type="submit">Save</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {places.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
              <span className="min-w-0">
                <span className="block font-semibold">{p.label}</span>
                <span className="block truncate text-sm text-muted-foreground">{p.address}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void deletePlace({ data: { id: p.id } }).then(() => setPlaces((list) => list.filter((x) => x.id !== p.id)));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {plans.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Repeating jobs</h2>
          <ul className="mt-3 space-y-2">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
                <span>
                  <span className="block font-semibold">{serviceById(p.serviceId).name}</span>
                  <span className="text-sm text-muted-foreground">
                    {p.cadence} · next {new Date(p.nextAt).toLocaleDateString()}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void toggleRecurring({ data: { id: p.id, active: !p.active } }).then(() =>
                      setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x))),
                    );
                  }}
                >
                  {p.active ? "Pause" : "Resume"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
