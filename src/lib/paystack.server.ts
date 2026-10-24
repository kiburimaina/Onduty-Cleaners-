import type { Sql } from "@/lib/db";
import { getRequest } from "@tanstack/react-start/server";

export const PAYSTACK_CURRENCIES = ["KES", "NGN", "GHS", "ZAR", "USD"] as const;
export type PaystackCurrency = (typeof PAYSTACK_CURRENCIES)[number];

const PUBLIC_RE = /^pk_test_[A-Za-z0-9]{8,}$/;
const SECRET_RE = /^sk_test_[A-Za-z0-9]{8,}$/;

export function assertTestPublic(key: string) {
  const value = key.trim();
  if (!PUBLIC_RE.test(value)) throw new Error("Public key must be a Paystack test key (pk_test_…)");
  return value;
}

export function assertTestSecret(key: string) {
  const value = key.trim();
  if (value.startsWith("sk_live_") || value.startsWith("pk_live_")) {
    throw new Error("That is a live key. Paste test keys only. They start with sk_test_ and pk_test_.");
  }
  if (!SECRET_RE.test(value)) throw new Error("Secret key must be a Paystack test key (sk_test_…)");
  return value;
}

export function assertCurrency(value: string): PaystackCurrency {
  const currency = value.trim().toUpperCase();
  if ((PAYSTACK_CURRENCIES as readonly string[]).includes(currency)) return currency as PaystackCurrency;
  throw new Error("Currency must be KES, NGN, GHS, ZAR, or USD");
}

export function keyHint(key: string) {
  if (key.length < 16) return "";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function appOrigin() {
  const request = getRequest();
  if (!request) throw new Error("No request");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "") ||
    "https";
  return `${proto}://${host}`;
}

type PaystackBody = { status?: boolean; message?: string; data?: Record<string, unknown> };

async function paystackFetch(secret: string, path: string, init?: RequestInit): Promise<PaystackBody> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as PaystackBody;
  if (!res.ok || json.status === false) throw new Error(json.message || "Paystack refused the request");
  return json;
}

export async function paystackPing(secret: string) {
  await paystackFetch(secret, "/balance");
}

export async function paystackInitialize(
  secret: string,
  input: { email: string; amount: number; currency: string; reference: string; callbackUrl: string },
) {
  const json = await paystackFetch(secret, "/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
    }),
  });
  const url = json.data?.authorization_url;
  if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("Paystack did not return a checkout link");
  return url;
}

export async function paystackVerify(secret: string, reference: string) {
  const json = await paystackFetch(secret, `/transaction/verify/${encodeURIComponent(reference)}`);
  const data = json.data ?? {};
  return {
    status: typeof data.status === "string" ? data.status : "",
    amount: typeof data.amount === "number" ? data.amount : Number(data.amount ?? 0),
    currency: typeof data.currency === "string" ? data.currency : "",
  };
}

export async function paystackRefund(secret: string, reference: string) {
  await paystackFetch(secret, "/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: reference }),
  });
}

export type PaystackKeys = { publicKey: string; secretKey: string; currency: string; fromEnv: boolean };

export function keysReady(keys: PaystackKeys) {
  return keys.publicKey.startsWith("pk_test_") && keys.secretKey.startsWith("sk_test_");
}

export async function loadPaystackKeys(sql: Sql): Promise<PaystackKeys> {
  const envSecret = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  const envPublic = process.env.PAYSTACK_PUBLIC_KEY?.trim() ?? "";
  if (envSecret || envPublic) {
    return {
      publicKey: envPublic ? assertTestPublic(envPublic) : "",
      secretKey: envSecret ? assertTestSecret(envSecret) : "",
      currency: assertCurrency(process.env.PAYSTACK_CURRENCY?.trim() || "KES"),
      fromEnv: true,
    };
  }
  const rows = await sql<{ public_key: string; secret_key: string; currency: string }>`select public_key, secret_key, currency from paystack_keys where id = 1`;
  return {
    publicKey: rows[0]?.public_key ?? "",
    secretKey: rows[0]?.secret_key ?? "",
    currency: rows[0]?.currency || "KES",
    fromEnv: false,
  };
}

export async function refundPaystackForJob(sql: Sql, jobId: string) {
  const rows = await sql<{ reference: string | null }>`select reference from payments where job_id = ${jobId} and method = ${"paystack"} and status <> ${"voided"} limit 1`;
  const reference = rows[0]?.reference;
  if (!reference) return;
  const keys = await loadPaystackKeys(sql);
  if (!keys.secretKey.startsWith("sk_test_")) throw new Error("Paystack test key is missing, so the refund was not sent");
  await paystackRefund(keys.secretKey, reference);
}
