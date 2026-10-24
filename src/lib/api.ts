import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import {
  CLEANERS,
  CREW_SHARE,
  DRYCLEAN_ITEMS,
  buildChecklist,
  nearestCleaners,
  plantById,
  quoteHours,
  quotePrice,
  serviceById,
} from "@/lib/data";
import type {
  Cadence,
  Dispute,
  Earnings,
  HomeSize,
  IdType,
  Job,
  JobStatus,
  LaundryLoad,
  LaundryMode,
  Me,
  Notice,
  Payment,
  Place,
  Profile,
  RecurringPlan,
  ServiceId,
  ShopOffer,
  Ticket,
  UserRole,
  VettingDraft,
  VettingQueueItem,
  VettingStatus,
  Wallet,
  WhenKind,
} from "@/lib/types";
import { uid } from "@/lib/utils";

type JobRow = {
  id: string;
  customer_id: string;
  customer_name: string;
  cleaner_id: string | null;
  cleaner_name: string | null;
  service_id: ServiceId;
  size: HomeSize;
  when_kind: WhenKind;
  scheduled_for: string | null;
  address: string;
  notes: string;
  status: JobStatus;
  eta_minutes: number;
  travel_progress: number;
  clean_progress: number;
  price_cents: number;
  hours: number;
  rating: number | null;
  tip_cents: number;
  customer_rating: number | null;
  checklist: string;
  laundry_mode: LaundryMode | null;
  laundry_load: LaundryLoad | null;
  plant_id: string | null;
  add_laundry: boolean;
  created_at: string;
  status_at?: string | null;
  pieces?: string | null;
  offer?: string | null;
  leg?: string | null;
};

function parseChecklist(raw: string) {
  try {
    const v = JSON.parse(raw) as { id: string; label: string; done: boolean }[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parsePieces(raw: string | null | undefined) {
  try {
    const v = JSON.parse(raw || "[]") as { id: string; qty: number }[];
    return Array.isArray(v) ? v.filter((p) => p && p.qty > 0) : [];
  } catch {
    return [];
  }
}

function mapJob(row: JobRow, viewerId: string, paymentStatus: Job["paymentStatus"] = "none"): Job {
  const travel = Number(row.travel_progress);
  const baseEta = Number(row.eta_minutes);
  const offer: ShopOffer = row.offer === "dryclean" ? "dryclean" : "wash";
  const leg = row.leg === "return" || row.leg === "wash" ? row.leg : "pickup";
  return {
    id: row.id,
    role: row.cleaner_id === viewerId ? "cleaner" : "customer",
    serviceId: row.service_id,
    size: row.size,
    whenKind: row.when_kind,
    scheduledFor: row.scheduled_for,
    address: row.address,
    notes: row.notes,
    cleanerId: row.cleaner_id,
    cleanerName: row.cleaner_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    status: row.status,
    createdAt: row.created_at,
    etaMinutes: row.status === "en_route" ? Math.max(0, baseEta * (1 - travel)) : baseEta,
    travelProgress: travel,
    cleanProgress: Number(row.clean_progress),
    price: Number(row.price_cents) / 100,
    hours: Number(row.hours),
    rating: row.rating,
    tip: Number(row.tip_cents) / 100,
    checklist: parseChecklist(row.checklist),
    laundryMode: row.laundry_mode,
    laundryLoad: row.laundry_load,
    plantId: row.plant_id,
    addLaundry: Boolean(row.add_laundry),
    offer,
    leg,
    pieces: parsePieces(row.pieces),
    paymentStatus,
    customerRating: row.customer_rating == null ? null : Number(row.customer_rating),
  };
}

async function ensureProfile(sql: Sql, userId: string, name = ""): Promise<Profile> {
  await sql`insert into profiles (user_id, name, role) values (${userId}, ${name}, ${"customer"}) on conflict (user_id) do nothing`;
  const admins = await sql<{ user_id: string }>`select user_id from profiles where role = ${"admin"} limit 1`;
  if (admins.length === 0) {
    await sql`update profiles set role = ${"admin"} where user_id = ${userId}`;
  }
  if (name) {
    await sql`update profiles set name = ${name} where user_id = ${userId} and (name = ${""} or name is null)`;
  }
  const rows = await sql<{
    user_id: string;
    name: string;
    role: UserRole;
    phone: string;
    address: string;
  }>`select user_id, name, role, phone, address from profiles where user_id = ${userId}`;
  const p = rows[0]!;
  return { userId: p.user_id, name: p.name, role: p.role, phone: p.phone, address: p.address };
}

async function loadVetting(sql: Sql, userId: string): Promise<VettingSummaryLike> {
  const rows = await sql<{
    status: VettingStatus;
    staff_note: string;
    submitted_at: string | null;
  }>`select status, staff_note, submitted_at from cleaner_applications where user_id = ${userId} limit 1`;
  const row = rows[0];
  if (!row) return { status: "none", staffNote: "", submittedAt: null };
  return { status: row.status, staffNote: row.staff_note, submittedAt: row.submitted_at };
}

type VettingSummaryLike = { status: VettingStatus; staffNote: string; submittedAt: string | null };

function isCleared(role: UserRole, status: VettingStatus) {
  return role === "admin" || status === "approved";
}

async function requireClearedCleaner(sql: Sql, userId: string) {
  const profile = await ensureProfile(sql, userId);
  const vetting = await loadVetting(sql, userId);
  if (!isCleared(profile.role, vetting.status)) {
    throw new Error("Staff must approve your ID, photo, and good conduct before you can take jobs");
  }
  return profile;
}

const MAX_IMG = 240_000;

function assertImage(value: string, label: string, required = true) {
  if (!value) {
    if (required) throw new Error(`${label} is required`);
    return;
  }
  if (!value.startsWith("data:image/")) throw new Error(`${label} must be a photo`);
  if (value.length > MAX_IMG) throw new Error(`${label} is too large — take it again a bit farther back`);
}

function isAdult(dob: string) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cut = new Date();
  cut.setFullYear(cut.getFullYear() - 18);
  return d <= cut;
}

async function requireAdmin(sql: Sql, userId: string) {
  const profile = await ensureProfile(sql, userId);
  if (profile.role !== "admin") throw new Error("Forbidden");
  return profile;
}

async function notify(sql: Sql, userId: string, title: string, body: string, jobId: string | null = null) {
  if (!userId || CLEANERS.some((c) => c.id === userId)) return;
  await sql`insert into notifications (id, user_id, title, body, job_id) values (${uid("nt")}, ${userId}, ${title}, ${body}, ${jobId})`;
}

async function paymentFor(sql: Sql, jobId: string, userId: string): Promise<Job["paymentStatus"]> {
  const rows = await sql<{ status: string }>`select status from payments where job_id = ${jobId} and user_id = ${userId} order by created_at desc limit 1`;
  const s = rows[0]?.status;
  if (s === "authorized" || s === "captured" || s === "voided") return s;
  return "none";
}

async function loadJob(sql: Sql, jobId: string, viewerId: string, isAdmin: boolean) {
  const rows = await sql<JobRow>`select * from jobs where id = ${jobId} limit 1`;
  const row = rows[0];
  if (!row) return null;
  if (!isAdmin && row.customer_id !== viewerId && row.cleaner_id !== viewerId) return null;
  const pay = await paymentFor(sql, jobId, row.customer_id);
  return mapJob(row, viewerId, pay);
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const wallets = await sql<{
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    }>`select brand, last4, exp_month, exp_year from wallets where user_id = ${context.userId}`;
    const unread = await sql<{ n: number }>`select count(*)::int as n from notifications where user_id = ${context.userId} and read = false`;
    const duty = await sql<{ online: boolean }>`select online from duty_status where user_id = ${context.userId}`;
    const vetting = await loadVetting(sql, context.userId);
    const wallet = wallets[0]
      ? {
          brand: wallets[0].brand,
          last4: wallets[0].last4,
          expMonth: wallets[0].exp_month,
          expYear: wallets[0].exp_year,
        }
      : null;
    return {
      profile,
      wallet,
      unread: unread[0]?.n ?? 0,
      dutyOnline: Boolean(duty[0]?.online),
      isAdmin: profile.role === "admin",
      vetting,
      cleared: isCleared(profile.role, vetting.status),
    };
  });

export const syncSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, data.name ?? "");
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name?: string; phone?: string; address?: string; role?: UserRole }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const name = data.name ?? profile.name;
    const phone = data.phone ?? profile.phone;
    const address = data.address ?? profile.address;
    let role = profile.role;
    if (data.role === "customer" && profile.role !== "admin") role = "customer";
    if (data.role === "cleaner" && profile.role !== "admin") {
      const vetting = await loadVetting(sql, context.userId);
      if (vetting.status !== "approved") throw new Error("Finish crew checks first — staff reviews ID and good conduct");
      role = "cleaner";
    }
    await sql`update profiles set name = ${name}, phone = ${phone}, address = ${address}, role = ${role} where user_id = ${context.userId}`;
    return { ...profile, name, phone, address, role };
  });

export const saveWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { brand: string; last4: string; expMonth: number; expYear: number }) => {
    const last4 = d.last4.replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) throw new Error("Enter the last four digits");
    const brand = ["visa", "mastercard", "amex"].includes(d.brand) ? d.brand : "visa";
    if (!cardCurrent(d.expMonth, d.expYear)) throw new Error("That card is expired");
    return { brand, last4, expMonth: d.expMonth, expYear: d.expYear };
  })
  .handler(async ({ context, data }): Promise<Wallet> => {
    const sql = await getSql();
    await sql`insert into wallets (user_id, brand, last4, exp_month, exp_year, updated_at)
      values (${context.userId}, ${data.brand}, ${data.last4}, ${data.expMonth}, ${data.expYear}, now())
      on conflict (user_id) do update set brand = ${data.brand}, last4 = ${data.last4}, exp_month = ${data.expMonth}, exp_year = ${data.expYear}, updated_at = now()`;
    return data;
  });

export const setDuty = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { online: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireClearedCleaner(sql, context.userId);
    await sql`insert into duty_status (user_id, online, updated_at) values (${context.userId}, ${data.online}, now())
      on conflict (user_id) do update set online = ${data.online}, updated_at = now()`;
    if (!data.online) {
      return { online: false };
    }
    return { online: true };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sweepLive(sql);
    const rows = await sql<JobRow>`select * from jobs where customer_id = ${context.userId} or cleaner_id = ${context.userId} order by created_at desc`;
    return Promise.all(rows.map(async (row) => mapJob(row, context.userId, await paymentFor(sql, row.id, row.customer_id))));
  });

export const listOpenJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sweepLive(sql);
    try {
      await requireClearedCleaner(sql, context.userId);
    } catch {
      return [];
    }
    const rows = await sql<JobRow>`select * from jobs where status = ${"searching"} and cleaner_id is null order by created_at asc`;
    return rows.map((row) => mapJob(row, context.userId, "none"));
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sweepLive(sql);
    const profile = await ensureProfile(sql, context.userId);
    return loadJob(sql, data.jobId, context.userId, profile.role === "admin");
  });

type CreateInput = {
  serviceId: ServiceId;
  size: HomeSize;
  whenKind: WhenKind;
  scheduledFor: string | null;
  address: string;
  notes: string;
  cleanerId: string | null;
  laundryMode: LaundryMode | null;
  laundryLoad: LaundryLoad | null;
  plantId: string | null;
  addLaundry: boolean;
  cadence: Cadence;
  customerName: string;
  offer: ShopOffer;
  pieces: { id: string; qty: number }[];
};

type PayMethod = {
  method: string;
  brand: string;
  last4: string;
  reference: string | null;
  status: "authorized" | "captured";
};

async function placeBookedJob(sql: Sql, userId: string, data: CreateInput, pay: PayMethod): Promise<Job> {
  const profile = await ensureProfile(sql, userId, data.customerName);
  const isLaundry = data.serviceId === "laundry";
  const offer: ShopOffer = isLaundry && data.offer === "dryclean" ? "dryclean" : "wash";
  const pieces = offer === "dryclean" ? normalizePieces(data.pieces) : [];
  if (offer === "dryclean" && pieces.length === 0) throw new Error("Add at least one piece");
  const dropoff = isLaundry && data.laundryMode === "dropoff";
  const plant = plantById(data.plantId);
  const roster = !dropoff && data.cleanerId ? CLEANERS.find((c) => c.id === data.cleanerId) : null;
  const hours = quoteHours(data.serviceId, data.size);
  const price = quotePrice(data.serviceId, data.size, roster?.rate, {
    mode: data.laundryMode ?? "collect",
    load: data.laundryLoad ?? "medium",
    addLaundry: data.addLaundry,
    offer,
    pieces,
  });
  if (price <= 0) throw new Error("Nothing to charge");
  if (data.whenKind === "schedule" && !data.scheduledFor) throw new Error("Pick a time for the visit");
  const scheduled = Boolean(data.whenKind === "schedule" && data.scheduledFor);
  let status: JobStatus = "searching";
  if (scheduled) status = "scheduled";
  else if (dropoff || roster) status = "matched";
  const id = uid("job");
  const address = dropoff ? plant.address : data.address.trim() || profile.address || "284 Riverside Ave";
  const checklist = JSON.stringify(buildChecklist(data.serviceId, data.addLaundry, { offer, mode: data.laundryMode }));
  const name = profile.name || data.customerName || "You";
  const nowIso = new Date().toISOString();
  await sql`insert into jobs (
      id, customer_id, customer_name, cleaner_id, cleaner_name, service_id, size, when_kind, scheduled_for,
      address, notes, status, eta_minutes, price_cents, hours, checklist, laundry_mode, laundry_load, plant_id, add_laundry,
      status_at, pieces, offer, leg
    ) values (
      ${id}, ${userId}, ${name}, ${roster?.id ?? null}, ${roster?.name ?? null},
      ${data.serviceId}, ${data.size}, ${data.whenKind}, ${scheduled ? data.scheduledFor : null},
      ${address}, ${data.notes}, ${status}, ${dropoff ? plant.walkMin : (roster?.etaMin ?? 10)},
      ${Math.round(price * 100)}, ${hours}, ${checklist}, ${isLaundry ? data.laundryMode : null},
      ${isLaundry || data.addLaundry ? (data.laundryLoad ?? "medium") : null}, ${isLaundry ? data.plantId : null}, ${Boolean(data.addLaundry && !isLaundry)},
      ${nowIso}, ${JSON.stringify(pieces)}, ${offer}, ${dropoff ? "wash" : "pickup"}
    )`;
  await sql`insert into payments (id, user_id, job_id, amount_cents, status, method, brand, last4, reference)
      values (${uid("pay")}, ${userId}, ${id}, ${Math.round(price * 100)}, ${pay.status}, ${pay.method}, ${pay.brand}, ${pay.last4}, ${pay.reference})`;
  if (data.cadence === "weekly" || data.cadence === "biweekly") {
    const next = new Date();
    next.setDate(next.getDate() + (data.cadence === "weekly" ? 7 : 14));
    await sql`insert into recurring (id, user_id, service_id, size, laundry_mode, laundry_load, plant_id, cadence, address, notes, next_at, active, offer, pieces, add_laundry)
        values (${uid("rec")}, ${userId}, ${data.serviceId}, ${data.size}, ${isLaundry ? data.laundryMode : data.addLaundry ? "collect" : null}, ${isLaundry || data.addLaundry ? (data.laundryLoad ?? "medium") : null}, ${isLaundry ? data.plantId : null},
          ${data.cadence}, ${address}, ${data.notes}, ${next.toISOString()}, true, ${offer}, ${JSON.stringify(pieces)}, ${Boolean(data.addLaundry && !isLaundry)})`;
  }
  if (status === "searching") {
    const onDuty = await sql<{ user_id: string }>`select user_id from duty_status where online = true`;
    for (const c of onDuty) {
      if (c.user_id !== userId) {
        await notify(sql, c.user_id, "New job nearby", `${name} · ${address}`, id);
      }
    }
  }
  const job = await loadJob(sql, id, userId, false);
  if (!job) throw new Error("Could not create job");
  return job;
}

export const createJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: CreateInput) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const wallets = await sql<{ last4: string; brand: string; exp_month: number; exp_year: number }>`select last4, brand, exp_month, exp_year from wallets where user_id = ${context.userId}`;
    if (!wallets[0]?.last4) throw new Error("Add a card before booking");
    if (!cardCurrent(Number(wallets[0].exp_month), Number(wallets[0].exp_year))) throw new Error("Card on file is expired");
    return placeBookedJob(sql, context.userId, data, {
      method: "card",
      brand: wallets[0].brand,
      last4: wallets[0].last4,
      reference: null,
      status: "authorized",
    });
  });

export const cancelJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const job = await loadJob(sql, data.jobId, context.userId, profile.role === "admin");
    if (!job) throw new Error("Job not found");
    if (!["searching", "matched", "scheduled"].includes(job.status)) throw new Error("Too late to cancel");
    const { refundPaystackForJob } = await import("@/lib/paystack.server");
    await refundPaystackForJob(sql, data.jobId);
    await sql`update jobs set status = ${"cancelled"}, updated_at = now() where id = ${data.jobId}`;
    await sql`update payments set status = ${"voided"} where job_id = ${data.jobId} and status in (${"authorized"}, ${"captured"})`;
    return { ok: true };
  });

export const acceptJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await requireClearedCleaner(sql, context.userId);
    const name = profile.name || "Cleaner";
    const nowIso = new Date().toISOString();
    const updated = await sql<JobRow>`update jobs set cleaner_id = ${context.userId}, cleaner_name = ${name}, status = ${"matched"}, status_at = ${nowIso}, updated_at = now()
      where id = ${data.jobId} and status = ${"searching"} and cleaner_id is null returning *`;
    if (!updated[0]) throw new Error("Job already taken");
    await notify(sql, updated[0].customer_id, "Cleaner confirmed", `${name} is on it`, data.jobId);
    return mapJob(updated[0], context.userId, await paymentFor(sql, data.jobId, updated[0].customer_id));
  });

export const simulateMatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sweepLive(sql);
    const profile = await ensureProfile(sql, context.userId);
    return loadJob(sql, data.jobId, context.userId, profile.role === "admin");
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string; status: JobStatus; cleanProgress?: number }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const job = await loadJob(sql, data.jobId, context.userId, profile.role === "admin");
    if (!job) throw new Error("Job not found");
    const nowIso = new Date().toISOString();
    await sql`update jobs set status = ${data.status}, clean_progress = ${data.cleanProgress ?? job.cleanProgress}, status_at = ${nowIso}, updated_at = now() where id = ${data.jobId}`;
    if (data.status === "complete") await captureAuthorized(sql, data.jobId);
    if (data.status === "en_route") {
      await notify(sql, job.customerId, "On the way", `${job.cleanerName ?? "Your cleaner"} is heading over`, data.jobId);
    }
    if (data.status === "in_progress") {
      await notify(sql, job.customerId, job.serviceId === "laundry" ? "In the wash" : "Cleaning started", "The checklist is live", data.jobId);
    }
    return loadJob(sql, data.jobId, context.userId, profile.role === "admin");
  });

export const tickJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sweepLive(sql);
    const profile = await ensureProfile(sql, context.userId);
    return loadJob(sql, data.jobId, context.userId, profile.role === "admin");
  });

export const rateJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string; rating: number; tip: number }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<JobRow>`select * from jobs where id = ${data.jobId} and customer_id = ${context.userId} limit 1`;
    if (!rows[0]) throw new Error("Job not found");
    const tipCents = Math.max(0, Math.round(data.tip * 100));
    await sql`update jobs set rating = ${data.rating}, tip_cents = ${tipCents}, updated_at = now() where id = ${data.jobId}`;
    if (tipCents > 0) {
      const wallets = await sql<{ brand: string; last4: string }>`select brand, last4 from wallets where user_id = ${context.userId}`;
      await sql`insert into payments (id, user_id, job_id, amount_cents, status, method, brand, last4)
        values (${uid("pay")}, ${context.userId}, ${data.jobId}, ${tipCents}, ${"captured"}, ${"card"}, ${wallets[0]?.brand ?? "visa"}, ${wallets[0]?.last4 ?? "4242"})`;
    }
    return loadJob(sql, data.jobId, context.userId, false);
  });

export const rateCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string; rating: number }) => {
    const rating = Math.round(Number(d.rating));
    if (rating < 1 || rating > 5) throw new Error("Pick 1 to 5 stars");
    return { jobId: d.jobId, rating };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<JobRow>`select * from jobs where id = ${data.jobId} and cleaner_id = ${context.userId} and status = ${"complete"} limit 1`;
    if (!rows[0]) throw new Error("Job not found");
    await sql`update jobs set customer_rating = ${data.rating}, updated_at = now() where id = ${data.jobId}`;
    await notify(sql, rows[0].customer_id, "Your crew left a rating", `${data.rating} / 5 on this visit`, data.jobId);
    return loadJob(sql, data.jobId, context.userId, false);
  });

export const listPlaces = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Place[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; label: string; address: string }>`select id, label, address from places where user_id = ${context.userId} order by created_at desc limit 8`;
    return rows;
  });

export const savePlace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { label: string; address: string }) => {
    const label = d.label.trim().slice(0, 32);
    const address = d.address.trim().slice(0, 180);
    if (label.length < 2) throw new Error("Name the place");
    if (address.length < 4) throw new Error("Address is too short");
    return { label, address };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into places (id, user_id, label, address) values (${uid("pl")}, ${context.userId}, ${data.label}, ${data.address})`;
    return { ok: true as const };
  });

export const deletePlace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from places where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

function fareCents(priceCents: number, tipCents: number) {
  return Math.round(Number(priceCents) * CREW_SHARE) + Number(tipCents);
}

export const getEarnings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Earnings> => {
    const sql = await getSql();
    const jobs = await sql<{
      id: string;
      service_id: ServiceId;
      price_cents: number;
      tip_cents: number;
      created_at: string;
      address: string;
    }>`select id, service_id, price_cents, tip_cents, created_at, address from jobs where cleaner_id = ${context.userId} and status = ${"complete"} order by created_at desc limit 40`;
    const paidRows = await sql<{ id: string; amount_cents: number; phone: string; created_at: string }>`select id, amount_cents, phone, created_at from payouts where user_id = ${context.userId} order by created_at desc limit 20`;
    const phones = await sql<{ payout_phone: string }>`select payout_phone from profiles where user_id = ${context.userId}`;
    const earned = jobs.reduce((sum, j) => sum + fareCents(j.price_cents, j.tip_cents), 0);
    const paid = paidRows.reduce((sum, p) => sum + Number(p.amount_cents), 0);
    return {
      balance: Math.max(0, earned - paid) / 100,
      paid: paid / 100,
      phone: phones[0]?.payout_phone ?? "",
      lines: jobs.map((j) => ({
        jobId: j.id,
        at: j.created_at,
        label: `${serviceById(j.service_id).name} · ${j.address}`,
        fare: Math.round(Number(j.price_cents) * CREW_SHARE) / 100,
        tip: Number(j.tip_cents) / 100,
      })),
      payouts: paidRows.map((p) => ({
        id: p.id,
        amount: Number(p.amount_cents) / 100,
        phone: p.phone,
        at: p.created_at,
      })),
    };
  });

export const savePayoutPhone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { phone: string }) => {
    const phone = d.phone.replace(/[^\d+]/g, "").slice(0, 16);
    if (phone.replace(/\D/g, "").length < 9) throw new Error("Enter a mobile money number");
    return { phone };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    await sql`update profiles set payout_phone = ${data.phone} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const jobs = await sql<{ price_cents: number; tip_cents: number }>`select price_cents, tip_cents from jobs where cleaner_id = ${context.userId} and status = ${"complete"}`;
    const paidRows = await sql<{ amount_cents: number }>`select amount_cents from payouts where user_id = ${context.userId}`;
    const earned = jobs.reduce((sum, j) => sum + fareCents(j.price_cents, j.tip_cents), 0);
    const paid = paidRows.reduce((sum, p) => sum + Number(p.amount_cents), 0);
    const due = earned - paid;
    if (due < 100) throw new Error("Nothing to cash out yet");
    const phones = await sql<{ payout_phone: string }>`select payout_phone from profiles where user_id = ${context.userId}`;
    const phone = phones[0]?.payout_phone ?? "";
    if (phone.replace(/\D/g, "").length < 9) throw new Error("Add a mobile money number first");
    await sql`insert into payouts (id, user_id, amount_cents, phone) values (${uid("po")}, ${context.userId}, ${due}, ${phone})`;
    await notify(sql, context.userId, "Payout sent", `${(due / 100).toFixed(2)} to ${phone}`, null);
    return { ok: true as const, amount: due / 100 };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Notice[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      body: string;
      job_id: string | null;
      read: boolean;
      created_at: string;
    }>`select id, title, body, job_id, read, created_at from notifications where user_id = ${context.userId} order by created_at desc limit 40`;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      jobId: r.job_id,
      read: r.read,
      createdAt: r.created_at,
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where user_id = ${context.userId}`;
    return { ok: true };
  });

export const listPayments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Payment[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      job_id: string | null;
      amount_cents: number;
      status: string;
      method: string;
      brand: string | null;
      last4: string | null;
      created_at: string;
    }>`select id, job_id, amount_cents, status, method, brand, last4, created_at from payments where user_id = ${context.userId} order by created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      amount: Number(r.amount_cents) / 100,
      status: r.status,
      method: r.method,
      brand: r.brand,
      last4: r.last4,
      createdAt: r.created_at,
    }));
  });

export const createDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { jobId: string; reason: string; detail: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const job = await loadJob(sql, data.jobId, context.userId, profile.role === "admin");
    if (!job) throw new Error("Job not found");
    const id = uid("dsp");
    await sql`insert into disputes (id, job_id, user_id, reason, detail, status) values (${id}, ${data.jobId}, ${context.userId}, ${data.reason}, ${data.detail}, ${"open"})`;
    const admins = await sql<{ user_id: string }>`select user_id from profiles where role = ${"admin"}`;
    for (const a of admins) await notify(sql, a.user_id, "New dispute", data.reason, data.jobId);
    return { id };
  });

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Dispute[]> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const rows =
      profile.role === "admin"
        ? await sql<DisputeRow>`select * from disputes order by created_at desc`
        : await sql<DisputeRow>`select * from disputes where user_id = ${context.userId} order by created_at desc`;
    return rows.map(mapDispute);
  });

type DisputeRow = {
  id: string;
  job_id: string;
  user_id: string;
  reason: string;
  detail: string;
  status: string;
  resolution: string;
  created_at: string;
};

function mapDispute(r: DisputeRow): Dispute {
  return {
    id: r.id,
    jobId: r.job_id,
    userId: r.user_id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.created_at,
  };
}

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; resolution: string; refund: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (profile.role !== "admin") throw new Error("Forbidden");
    const rows = await sql<DisputeRow>`select * from disputes where id = ${data.id} limit 1`;
    if (!rows[0]) throw new Error("Not found");
    await sql`update disputes set status = ${"resolved"}, resolution = ${data.resolution} where id = ${data.id}`;
    if (data.refund) {
      const { refundPaystackForJob } = await import("@/lib/paystack.server");
      await refundPaystackForJob(sql, rows[0].job_id);
      await sql`update payments set status = ${"voided"} where job_id = ${rows[0].job_id} and status in (${"authorized"}, ${"captured"})`;
    }
    await notify(sql, rows[0].user_id, "Dispute resolved", data.resolution, rows[0].job_id);
    return { ok: true };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { subject: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid("tkt");
    await sql`insert into tickets (id, user_id, subject, status) values (${id}, ${context.userId}, ${data.subject}, ${"open"})`;
    await sql`insert into ticket_messages (id, ticket_id, user_id, from_ops, body) values (${uid("msg")}, ${id}, ${context.userId}, false, ${data.body})`;
    await sql`insert into ticket_messages (id, ticket_id, user_id, from_ops, body) values (${uid("msg")}, ${id}, ${"ops"}, true, ${"We'll review within an hour. If this is a live job, open it and tap Report."})`;
    return { id };
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Ticket[]> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const tickets =
      profile.role === "admin"
        ? await sql<{ id: string; user_id: string; subject: string; status: string; created_at: string }>`select * from tickets order by created_at desc`
        : await sql<{ id: string; user_id: string; subject: string; status: string; created_at: string }>`select * from tickets where user_id = ${context.userId} order by created_at desc`;
    const out: Ticket[] = [];
    for (const t of tickets) {
      const messages = await sql<{
        id: string;
        from_ops: boolean;
        body: string;
        created_at: string;
      }>`select id, from_ops, body, created_at from ticket_messages where ticket_id = ${t.id} order by created_at`;
      out.push({
        id: t.id,
        userId: t.user_id,
        subject: t.subject,
        status: t.status,
        createdAt: t.created_at,
        messages: messages.map((m) => ({
          id: m.id,
          fromOps: m.from_ops,
          body: m.body,
          createdAt: m.created_at,
        })),
      });
    }
    return out;
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { ticketId: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const tickets = await sql<{ id: string; user_id: string }>`select id, user_id from tickets where id = ${data.ticketId} limit 1`;
    const t = tickets[0];
    if (!t) throw new Error("Not found");
    if (profile.role !== "admin" && t.user_id !== context.userId) throw new Error("Forbidden");
    const fromOps = profile.role === "admin";
    await sql`insert into ticket_messages (id, ticket_id, user_id, from_ops, body) values (${uid("msg")}, ${data.ticketId}, ${context.userId}, ${fromOps}, ${data.body})`;
    if (fromOps) await notify(sql, t.user_id, "Support replied", data.body.slice(0, 80), null);
    return { ok: true };
  });

export const listRecurring = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RecurringPlan[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      service_id: ServiceId;
      size: HomeSize;
      laundry_mode: LaundryMode | null;
      laundry_load: LaundryLoad | null;
      plant_id: string | null;
      cadence: "weekly" | "biweekly";
      address: string;
      notes: string;
      next_at: string;
      active: boolean;
    }>`select * from recurring where user_id = ${context.userId} order by created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      serviceId: r.service_id,
      size: r.size,
      laundryMode: r.laundry_mode,
      laundryLoad: r.laundry_load,
      plantId: r.plant_id,
      cadence: r.cadence,
      address: r.address,
      notes: r.notes,
      nextAt: r.next_at,
      active: r.active,
    }));
  });

export const toggleRecurring = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; active: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update recurring set active = ${data.active} where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const adminListJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sweepLive(sql);
    await requireAdmin(sql, context.userId);
    const rows = await sql<JobRow>`select * from jobs order by created_at desc limit 80`;
    return rows.map((row) => mapJob(row, context.userId, "none"));
  });

type DraftInput = {
  legalName: string;
  phone: string;
  city: string;
  dob: string;
  idType: IdType;
  idNumber: string;
  idExpiry: string;
  conductIssued: string;
  profilePhoto: string;
  idFront: string;
  idBack: string;
  goodConduct: string;
  selfie: string;
};

function normalizeDraft(d: DraftInput): DraftInput {
  const idType: IdType =
    d.idType === "passport" || d.idType === "driving_license" ? d.idType : "national_id";
  return {
    legalName: d.legalName.trim().slice(0, 80),
    phone: d.phone.trim().slice(0, 32),
    city: d.city.trim().slice(0, 80),
    dob: d.dob.trim().slice(0, 16),
    idType,
    idNumber: d.idNumber.trim().slice(0, 40),
    idExpiry: d.idExpiry.trim().slice(0, 16),
    conductIssued: d.conductIssued.trim().slice(0, 16),
    profilePhoto: d.profilePhoto,
    idFront: d.idFront,
    idBack: d.idBack,
    goodConduct: d.goodConduct,
    selfie: d.selfie,
  };
}

type AppRow = {
  user_id: string;
  legal_name: string;
  phone: string;
  city: string;
  dob: string;
  id_type: IdType;
  id_number: string;
  id_expiry: string;
  conduct_issued: string;
  profile_photo: string;
  id_front: string;
  id_back: string;
  good_conduct: string;
  selfie: string;
  status: VettingStatus;
  staff_note: string;
  submitted_at: string | null;
};

function mapDraft(row: AppRow): VettingDraft {
  return {
    legalName: row.legal_name,
    phone: row.phone,
    city: row.city,
    dob: row.dob,
    idType: row.id_type,
    idNumber: row.id_number,
    idExpiry: row.id_expiry,
    conductIssued: row.conduct_issued,
    profilePhoto: row.profile_photo,
    idFront: row.id_front,
    idBack: row.id_back,
    goodConduct: row.good_conduct,
    selfie: row.selfie,
    status: row.status,
    staffNote: row.staff_note,
    submittedAt: row.submitted_at,
  };
}

async function upsertDraft(sql: Sql, userId: string, data: DraftInput, status: VettingStatus) {
  await sql`insert into cleaner_applications (
      user_id, legal_name, phone, city, dob, id_type, id_number, id_expiry, conduct_issued,
      profile_photo, id_front, id_back, good_conduct, selfie, status, updated_at
    ) values (
      ${userId}, ${data.legalName}, ${data.phone}, ${data.city}, ${data.dob}, ${data.idType}, ${data.idNumber},
      ${data.idExpiry}, ${data.conductIssued}, ${data.profilePhoto}, ${data.idFront}, ${data.idBack},
      ${data.goodConduct}, ${data.selfie}, ${status}, now()
    )
    on conflict (user_id) do update set
      legal_name = ${data.legalName},
      phone = ${data.phone},
      city = ${data.city},
      dob = ${data.dob},
      id_type = ${data.idType},
      id_number = ${data.idNumber},
      id_expiry = ${data.idExpiry},
      conduct_issued = ${data.conductIssued},
      profile_photo = ${data.profilePhoto},
      id_front = ${data.idFront},
      id_back = ${data.idBack},
      good_conduct = ${data.goodConduct},
      selfie = ${data.selfie},
      status = ${status},
      updated_at = now()`;
}

export const getMyVetting = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<VettingDraft> => {
    const sql = await getSql();
    const rows = await sql<AppRow>`select * from cleaner_applications where user_id = ${context.userId} limit 1`;
    if (!rows[0]) {
      const profile = await ensureProfile(sql, context.userId);
      return {
        legalName: profile.name,
        phone: profile.phone,
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
    return mapDraft(rows[0]);
  });

export const saveVettingDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: DraftInput) => normalizeDraft(d))
  .handler(async ({ context, data }): Promise<VettingDraft> => {
    const sql = await getSql();
    const current = await loadVetting(sql, context.userId);
    if (current.status === "pending" || current.status === "approved") {
      throw new Error(current.status === "approved" ? "You're already cleared" : "Already with staff — wait for a review");
    }
    assertImage(data.profilePhoto, "Profile photo", false);
    assertImage(data.idFront, "ID photo", false);
    assertImage(data.idBack, "ID back", false);
    assertImage(data.goodConduct, "Good conduct", false);
    assertImage(data.selfie, "Selfie", false);
    await upsertDraft(sql, context.userId, data, current.status === "needs_info" ? "needs_info" : "draft");
    const rows = await sql<AppRow>`select * from cleaner_applications where user_id = ${context.userId} limit 1`;
    return mapDraft(rows[0]!);
  });

export const submitVetting = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: DraftInput) => normalizeDraft(d))
  .handler(async ({ context, data }): Promise<VettingDraft> => {
    const sql = await getSql();
    const current = await loadVetting(sql, context.userId);
    if (current.status === "pending") throw new Error("Already with staff");
    if (current.status === "approved") throw new Error("You're already cleared");
    if (data.legalName.length < 2) throw new Error("Legal name is required");
    if (data.phone.length < 7) throw new Error("Phone is required");
    if (data.city.length < 2) throw new Error("City is required");
    if (!isAdult(data.dob)) throw new Error("You must be 18 or older");
    if (data.idNumber.length < 5) throw new Error("ID number is required");
    if (!data.idExpiry) throw new Error("ID expiry is required");
    if (!data.conductIssued) throw new Error("Good-conduct issue date is required");
    assertImage(data.profilePhoto, "Profile photo");
    assertImage(data.idFront, "ID photo");
    assertImage(data.idBack, "ID back", false);
    assertImage(data.goodConduct, "Good conduct certificate");
    assertImage(data.selfie, "Live selfie");
    await upsertDraft(sql, context.userId, data, "pending");
    await sql`update cleaner_applications set submitted_at = now(), staff_note = ${""} where user_id = ${context.userId}`;
    await sql`update profiles set name = ${data.legalName}, phone = ${data.phone} where user_id = ${context.userId} and role <> ${"admin"}`;
    const admins = await sql<{ user_id: string }>`select user_id from profiles where role = ${"admin"}`;
    for (const a of admins) {
      await notify(sql, a.user_id, "Crew check waiting", `${data.legalName} submitted ID and good conduct`, null);
    }
    const rows = await sql<AppRow>`select * from cleaner_applications where user_id = ${context.userId} limit 1`;
    return mapDraft(rows[0]!);
  });

export const adminListApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<VettingQueueItem[]> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<{
      user_id: string;
      legal_name: string;
      phone: string;
      city: string;
      id_type: IdType;
      status: VettingStatus;
      submitted_at: string | null;
      staff_note: string;
    }>`select user_id, legal_name, phone, city, id_type, status, submitted_at, staff_note
      from cleaner_applications
      where status <> ${"draft"} and status <> ${"none"}
      order by submitted_at desc
      limit 80`;
    return rows.map((r) => ({
      userId: r.user_id,
      legalName: r.legal_name,
      phone: r.phone,
      city: r.city,
      idType: r.id_type,
      status: r.status,
      submittedAt: r.submitted_at,
      staffNote: r.staff_note,
    }));
  });

export const adminGetApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }): Promise<VettingDraft & { userId: string }> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<AppRow>`select * from cleaner_applications where user_id = ${data.userId} limit 1`;
    if (!rows[0]) throw new Error("Not found");
    return { ...mapDraft(rows[0]), userId: rows[0].user_id };
  });

export const adminReviewApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; decision: "approved" | "rejected" | "needs_info"; note: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<{ user_id: string; legal_name: string; phone: string; status: string }>`
      select user_id, legal_name, phone, status from cleaner_applications where user_id = ${data.userId} limit 1`;
    const app = rows[0];
    if (!app) throw new Error("Not found");
    const note = data.note.trim().slice(0, 400);
    await sql`update cleaner_applications
      set status = ${data.decision}, staff_note = ${note}, reviewed_at = now(), reviewed_by = ${context.userId}, updated_at = now()
      where user_id = ${data.userId}`;
    if (data.decision === "approved") {
      await sql`update profiles set role = ${"cleaner"}, name = ${app.legal_name}, phone = ${app.phone} where user_id = ${data.userId} and role <> ${"admin"}`;
      await notify(sql, data.userId, "You're cleared to go on duty", "Staff approved your ID, photo, and good conduct. You can go online.", null);
    } else if (data.decision === "needs_info") {
      await sql`insert into duty_status (user_id, online, updated_at) values (${data.userId}, ${false}, now())
        on conflict (user_id) do update set online = false, updated_at = now()`;
      await notify(sql, data.userId, "Crew check needs another look", note || "Staff asked for a clearer photo or document.", null);
    } else {
      await sql`insert into duty_status (user_id, online, updated_at) values (${data.userId}, ${false}, now())
        on conflict (user_id) do update set online = false, updated_at = now()`;
      await notify(sql, data.userId, "Crew application not approved", note || "Staff could not verify your documents.", null);
    }
    return { ok: true as const };
  });

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { lat: number; lng: number }) => d)
  .handler(async ({ data }) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.lat}&lon=${data.lng}&format=json`;
      const res = await fetch(url, { headers: { "User-Agent": "OnDutyCleaners/1.0" } });
      if (!res.ok) throw new Error("lookup failed");
      const json = (await res.json()) as { display_name?: string };
      return { address: json.display_name ?? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` };
    } catch {
      return { address: `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` };
    }
  });

async function spawnDueRecurring(sql: Sql) {
  const due = await sql<{
    id: string;
    user_id: string;
    service_id: ServiceId;
    size: HomeSize;
    laundry_mode: LaundryMode | null;
    laundry_load: LaundryLoad | null;
    plant_id: string | null;
    cadence: "weekly" | "biweekly";
    address: string;
    notes: string;
    next_at: string;
    offer: string | null;
    pieces: string | null;
    add_laundry: boolean | null;
  }>`select * from recurring where active = true and next_at <= ${new Date().toISOString()}`;
  for (const r of due) {
    const next = new Date();
    next.setDate(next.getDate() + (r.cadence === "weekly" ? 7 : 14));
    const claimed = await sql<{ id: string }>`update recurring set next_at = ${next.toISOString()} where id = ${r.id} and next_at <= ${new Date().toISOString()} returning id`;
    if (!claimed[0]) continue;
    try {
      const profile = await ensureProfile(sql, r.user_id);
      const wallets = await sql<{ last4: string; brand: string; exp_month: number; exp_year: number }>`select last4, brand, exp_month, exp_year from wallets where user_id = ${r.user_id}`;
      if (!wallets[0] || !cardCurrent(Number(wallets[0].exp_month), Number(wallets[0].exp_year))) {
        const later = new Date();
        later.setDate(later.getDate() + 1);
        await sql`update recurring set next_at = ${later.toISOString()} where id = ${r.id}`;
        await notify(sql, r.user_id, "Repeating visit skipped", "The card on file is missing or expired. Update the wallet and the next visit will book.", null);
        continue;
      }
      const offer: ShopOffer = r.service_id === "laundry" && r.offer === "dryclean" ? "dryclean" : "wash";
      const pieces = offer === "dryclean" ? normalizePieces(parsePieces(r.pieces)) : [];
      const addLaundry = Boolean(r.add_laundry) && r.service_id !== "laundry";
      const drop = r.service_id === "laundry" && r.laundry_mode === "dropoff";
      const price = quotePrice(r.service_id, r.size, undefined, {
        mode: r.laundry_mode ?? "collect",
        load: r.laundry_load ?? "medium",
        addLaundry,
        offer,
        pieces,
      });
      if (price <= 0) {
        await notify(sql, r.user_id, "Repeating visit skipped", "That plan had nothing to charge. Edit it from Account.", null);
        continue;
      }
      const id = uid("job");
      const nowIso = new Date().toISOString();
      await sql`insert into jobs (
        id, customer_id, customer_name, service_id, size, when_kind, address, notes, status, eta_minutes, price_cents, hours, checklist, laundry_mode, laundry_load, plant_id, status_at, offer, leg, pieces, add_laundry
      ) values (
        ${id}, ${r.user_id}, ${profile.name || "You"}, ${r.service_id}, ${r.size}, ${"now"}, ${r.address}, ${r.notes}, ${drop ? "matched" : "searching"},
        ${10}, ${Math.round(price * 100)}, ${quoteHours(r.service_id, r.size)}, ${JSON.stringify(buildChecklist(r.service_id, addLaundry, { offer, mode: r.laundry_mode }))},
        ${r.laundry_mode}, ${r.laundry_load}, ${r.plant_id}, ${nowIso}, ${offer}, ${drop ? "wash" : "pickup"}, ${JSON.stringify(pieces)}, ${addLaundry}
      )`;
      await sql`insert into payments (id, user_id, job_id, amount_cents, status, method, brand, last4)
        values (${uid("pay")}, ${r.user_id}, ${id}, ${Math.round(price * 100)}, ${"authorized"}, ${"card"}, ${wallets[0].brand}, ${wallets[0].last4})`;
      await notify(sql, r.user_id, "Repeating visit booked", "Your card is on hold. We'll match a crew.", id);
    } catch {
      await sql`update recurring set next_at = ${r.next_at} where id = ${r.id}`;
    }
  }
}

function cardCurrent(month: number, year: number) {
  if (!month || !year || month < 1 || month > 12) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (year < y) return false;
  if (year === y && month < m) return false;
  return true;
}

function normalizePieces(raw: { id: string; qty: number }[] | undefined) {
  if (!raw) return [];
  return raw
    .map((p) => ({ id: String(p.id), qty: Math.max(0, Math.min(20, Math.round(Number(p.qty) || 0))) }))
    .filter((p) => p.qty > 0 && DRYCLEAN_ITEMS.some((d) => d.id === p.id));
}

const SEARCH_MS = 8_000;
const DISPATCH_MS = 1_200;
const ARRIVE_MS = 1_800;
const DROPOFF_MS = 2_500;
const TRAVEL_MS = 12_000;
const WORK_MS = 14_000;
const WASH_MS = 16_000;

type ClockRow = JobRow;

function stamp(row: ClockRow) {
  const raw = row.status_at || row.created_at;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function isDropoff(row: ClockRow) {
  return row.service_id === "laundry" && row.laundry_mode === "dropoff";
}

function isDelivery(row: ClockRow) {
  return row.service_id === "laundry" && row.laundry_mode === "delivery";
}

function washing(row: ClockRow) {
  return row.service_id === "laundry" || Boolean(row.add_laundry);
}

async function captureAuthorized(sql: Sql, jobId: string) {
  await sql`update payments set status = ${"captured"} where job_id = ${jobId} and status = ${"authorized"}`;
}

async function transition(
  sql: Sql,
  row: ClockRow,
  status: JobStatus,
  waitMs: number,
  patch: Partial<ClockRow> & { checklist?: string; leg?: string },
  title?: string,
  body?: string,
): Promise<ClockRow | null> {
  const phaseStartMs = Math.min(Date.now(), stamp(row) + waitMs);
  const phaseStart = new Date(phaseStartMs).toISOString();
  const cleanerId = patch.cleaner_id !== undefined ? patch.cleaner_id : row.cleaner_id;
  const cleanerName = patch.cleaner_name !== undefined ? patch.cleaner_name : row.cleaner_name;
  const eta = patch.eta_minutes !== undefined ? patch.eta_minutes : row.eta_minutes;
  const travel = patch.travel_progress !== undefined ? patch.travel_progress : row.travel_progress;
  const clean = patch.clean_progress !== undefined ? patch.clean_progress : row.clean_progress;
  const checklist = patch.checklist !== undefined ? patch.checklist : row.checklist;
  const leg = patch.leg !== undefined ? patch.leg : row.leg || "pickup";
  const updated = await sql<{ id: string }>`update jobs set
      status = ${status},
      cleaner_id = ${cleanerId},
      cleaner_name = ${cleanerName},
      eta_minutes = ${eta},
      travel_progress = ${travel},
      clean_progress = ${clean},
      checklist = ${checklist},
      leg = ${leg},
      status_at = ${phaseStart},
      updated_at = now()
    where id = ${row.id} and status = ${row.status}
    returning id`;
  if (!updated[0]) return null;
  if (status === "complete") await captureAuthorized(sql, row.id);
  const fresh = Date.now() - phaseStartMs < 25_000;
  if (title && (fresh || status === "complete")) await notify(sql, row.customer_id, title, body ?? "", row.id);
  return {
    ...row,
    status,
    cleaner_id: cleanerId,
    cleaner_name: cleanerName,
    eta_minutes: Number(eta),
    travel_progress: Number(travel),
    clean_progress: Number(clean),
    checklist: checklist ?? "[]",
    leg,
    status_at: phaseStart,
  };
}

async function step(sql: Sql, row: ClockRow): Promise<ClockRow | null> {
  const elapsed = Date.now() - stamp(row);
  if (row.status === "scheduled") {
    const when = row.scheduled_for ? new Date(row.scheduled_for).getTime() : Number.POSITIVE_INFINITY;
    if (when > Date.now()) return null;
    const wait = Math.max(0, when - stamp(row));
    return transition(sql, row, isDropoff(row) ? "matched" : "searching", wait, {});
  }
  if (row.status === "searching") {
    if (row.cleaner_id) return transition(sql, row, "matched", 0, {});
    if (elapsed < SEARCH_MS) return null;
    const pick = nearestCleaners(row.service_id, 1)[0] ?? CLEANERS[0]!;
    return transition(
      sql,
      row,
      "matched",
      SEARCH_MS,
      { cleaner_id: pick.id, cleaner_name: pick.name, eta_minutes: pick.etaMin },
      "Cleaner confirmed",
      `${pick.name} is on it`,
    );
  }
  if (row.status === "matched") {
    const wait = isDropoff(row) ? DROPOFF_MS : DISPATCH_MS;
    if (elapsed < wait) return null;
    if (isDropoff(row)) {
      return transition(sql, row, "in_progress", wait, { leg: "wash", clean_progress: 0 }, "In the wash", "The plant has the bags");
    }
    return transition(
      sql,
      row,
      "en_route",
      wait,
      { travel_progress: 0, leg: "pickup" },
      "On the way",
      `${row.cleaner_name ?? "Your cleaner"} is heading over`,
    );
  }
  if (row.status === "en_route") {
    const p = Math.min(1, elapsed / TRAVEL_MS);
    if (p < 1) {
      await sql`update jobs set travel_progress = ${p}, updated_at = now() where id = ${row.id} and status = ${"en_route"}`;
      return null;
    }
    if (row.leg === "return") {
      return transition(sql, row, "complete", TRAVEL_MS, { travel_progress: 1, eta_minutes: 0 }, "Delivered", "Receipt is ready. Rate the visit.");
    }
    return transition(
      sql,
      row,
      "arrived",
      TRAVEL_MS,
      { travel_progress: 1, eta_minutes: 0 },
      "At the door",
      `${row.cleaner_name ?? "Your cleaner"} has arrived`,
    );
  }
  if (row.status === "arrived") {
    if (elapsed < ARRIVE_MS) return null;
    const title = row.service_id === "laundry" ? "In the wash" : "Cleaning started";
    return transition(sql, row, "in_progress", ARRIVE_MS, { clean_progress: 0.02, leg: washing(row) ? "wash" : "pickup" }, title, "The checklist is live");
  }
  if (row.status === "in_progress") {
    const dur = washing(row) ? WASH_MS : WORK_MS;
    const p = Math.min(1, elapsed / dur);
    const items = parseChecklist(row.checklist).map((item, i, arr) => ({
      ...item,
      done: i < Math.floor(p * arr.length),
    }));
    if (p < 1) {
      await sql`update jobs set clean_progress = ${p}, checklist = ${JSON.stringify(items)}, updated_at = now() where id = ${row.id} and status = ${"in_progress"}`;
      return null;
    }
    const done = JSON.stringify(items.map((c) => ({ ...c, done: true })));
    if (isDelivery(row) && row.leg !== "return") {
      return transition(
        sql,
        row,
        "en_route",
        dur,
        { clean_progress: 1, checklist: done, travel_progress: 0, leg: "return", eta_minutes: 8 },
        "On the way back",
        "Clean clothes are headed to you",
      );
    }
    const ready = row.service_id === "laundry" ? "Ready for pickup" : "Job complete";
    return transition(sql, row, "complete", dur, { clean_progress: 1, checklist: done }, ready, "Receipt is ready. Rate the visit.");
  }
  return null;
}

async function advanceRow(sql: Sql, row: ClockRow) {
  let current = row;
  for (let i = 0; i < 8; i++) {
    const next = await step(sql, current);
    if (!next) return;
    current = next;
    if (current.status === "complete" || current.status === "cancelled") return;
  }
}

async function paystackApi() {
  return import("@/lib/paystack.server");
}

export const paystackReady = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    try {
      const { loadPaystackKeys, keysReady } = await paystackApi();
      const keys = await loadPaystackKeys(sql);
      return { enabled: keysReady(keys), currency: keys.currency || "KES" };
    } catch {
      return { enabled: false, currency: "KES" };
    }
  });

export const getPaystackSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const { loadPaystackKeys, keysReady, keyHint } = await paystackApi();
    const keys = await loadPaystackKeys(sql);
    return {
      enabled: keysReady(keys),
      fromEnv: keys.fromEnv,
      currency: keys.currency || "KES",
      publicHint: keyHint(keys.publicKey),
      publicKey: keys.publicKey.startsWith("pk_test_") ? keys.publicKey : "",
      secretSaved: keys.secretKey.startsWith("sk_test_"),
      secretHint: keyHint(keys.secretKey),
    };
  });

export const savePaystackKeys = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { publicKey: string; secretKey: string; currency: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const { loadPaystackKeys, assertTestPublic, assertTestSecret, assertCurrency } = await paystackApi();
    const existing = await loadPaystackKeys(sql);
    if (existing.fromEnv) throw new Error("Paystack keys are set on the server. Those override this form.");
    const publicKey = assertTestPublic(data.publicKey);
    const secretKey = data.secretKey.trim() ? assertTestSecret(data.secretKey) : existing.secretKey;
    if (!secretKey.startsWith("sk_test_")) throw new Error("Paste the test secret key (sk_test_…)");
    const currency = assertCurrency(data.currency);
    await sql`insert into paystack_keys (id, public_key, secret_key, currency, updated_at)
      values (1, ${publicKey}, ${secretKey}, ${currency}, now())
      on conflict (id) do update set public_key = ${publicKey}, secret_key = ${secretKey}, currency = ${currency}, updated_at = now()`;
    return { ok: true };
  });

export const testPaystackKeys = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const { loadPaystackKeys, keysReady, paystackPing } = await paystackApi();
    const keys = await loadPaystackKeys(sql);
    if (!keysReady(keys)) throw new Error("Save a pk_test_ and sk_test_ key first");
    await paystackPing(keys.secretKey);
    return { ok: true };
  });

export const startPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: CreateInput) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const { loadPaystackKeys, keysReady, paystackInitialize, appOrigin } = await paystackApi();
    const keys = await loadPaystackKeys(sql);
    if (!keysReady(keys)) throw new Error("Paystack test keys are not connected");
    const profile = await ensureProfile(sql, context.userId, data.customerName);
    const emails = await sql<{ email: string }>`select email from "user" where id = ${context.userId} limit 1`;
    const email = emails[0]?.email;
    if (!email) throw new Error("This account has no email for Paystack");
    const isLaundry = data.serviceId === "laundry";
    const offer: ShopOffer = isLaundry && data.offer === "dryclean" ? "dryclean" : "wash";
    const pieces = offer === "dryclean" ? normalizePieces(data.pieces) : [];
    const roster = data.laundryMode === "dropoff" ? null : data.cleanerId ? CLEANERS.find((c) => c.id === data.cleanerId) : null;
    const price = quotePrice(data.serviceId, data.size, roster?.rate, {
      mode: data.laundryMode ?? "collect",
      load: data.laundryLoad ?? "medium",
      addLaundry: data.addLaundry,
      offer,
      pieces,
    });
    if (price <= 0) throw new Error("Nothing to charge");
    const amount = Math.round(price * 100);
    const reference = uid("psk");
    await sql`insert into paystack_checkouts (reference, user_id, amount_cents, email, currency, payload, status)
      values (${reference}, ${context.userId}, ${amount}, ${email}, ${keys.currency}, ${JSON.stringify({ ...data, customerName: profile.name || data.customerName })}, ${"pending"})`;
    try {
      const url = await paystackInitialize(keys.secretKey, {
        email,
        amount,
        currency: keys.currency,
        reference,
        callbackUrl: `${appOrigin()}/pay/return`,
      });
      return { url };
    } catch (err) {
      await sql`delete from paystack_checkouts where reference = ${reference}`;
      throw err;
    }
  });

export const finishPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference: string }) => ({ reference: d.reference.trim() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (!data.reference) throw new Error("Missing payment reference");
    const rows = await sql<{
      user_id: string;
      amount_cents: number;
      currency: string;
      payload: string;
      status: string;
      job_id: string | null;
    }>`select user_id, amount_cents, currency, payload, status, job_id from paystack_checkouts where reference = ${data.reference} limit 1`;
    const row = rows[0];
    if (!row || row.user_id !== context.userId) throw new Error("Checkout not found");
    if (row.job_id) {
      const existing = await loadJob(sql, row.job_id, context.userId, false);
      if (!existing) throw new Error("Job not found");
      return existing;
    }
    const { loadPaystackKeys, keysReady, paystackVerify } = await paystackApi();
    const keys = await loadPaystackKeys(sql);
    if (!keysReady(keys)) throw new Error("Paystack test keys are not connected");
    const verified = await paystackVerify(keys.secretKey, data.reference);
    if (verified.status !== "success") throw new Error("Paystack has not confirmed this payment");
    if (verified.amount !== row.amount_cents) throw new Error("Paid amount does not match the quote");
    if (verified.currency && verified.currency !== row.currency) throw new Error("Paid currency does not match the quote");
    const payload = JSON.parse(row.payload) as CreateInput;
    const job = await placeBookedJob(sql, context.userId, payload, {
      method: "paystack",
      brand: "Paystack",
      last4: "",
      reference: data.reference,
      status: "captured",
    });
    await sql`update paystack_checkouts set status = ${"paid"}, job_id = ${job.id} where reference = ${data.reference}`;
    return job;
  });

async function sweepLive(sql: Sql) {
  await spawnDueRecurring(sql);
  const rows = await sql<ClockRow>`select * from jobs where status <> ${"complete"} and status <> ${"cancelled"}`;
  for (const row of rows) await advanceRow(sql, row);
  const stuck = await sql<{ id: string }>`select id from jobs where status = ${"complete"}`;
  for (const job of stuck) await captureAuthorized(sql, job.id);
}

if (typeof window === "undefined") {
  const clock = globalThis as typeof globalThis & { __ondutyTick?: () => void; __ondutyClock?: ReturnType<typeof setInterval> };
  clock.__ondutyTick = () => {
    void getSql()
      .then((sql) => sweepLive(sql))
      .catch(() => {});
  };
  if (!clock.__ondutyClock) {
    clock.__ondutyClock = setInterval(() => clock.__ondutyTick?.(), 1000);
    clock.__ondutyClock.unref?.();
  }
}
