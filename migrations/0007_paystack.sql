create table if not exists paystack_keys (
  id integer primary key default 1,
  public_key text not null default '',
  secret_key text not null default '',
  currency text not null default 'KES',
  updated_at timestamptz not null default now(),
  constraint paystack_keys_singleton check (id = 1)
);

create table if not exists paystack_checkouts (
  reference text primary key,
  user_id text not null,
  amount_cents integer not null,
  email text not null,
  currency text not null,
  payload text not null,
  status text not null default 'pending',
  job_id text,
  created_at timestamptz not null default now()
);

alter table payments add column if not exists reference text;
