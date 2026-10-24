alter table jobs add column if not exists customer_rating integer;
alter table profiles add column if not exists payout_phone text not null default '';

create table if not exists places (
  id text primary key,
  user_id text not null,
  label text not null,
  address text not null,
  created_at timestamptz not null default now()
);
create index if not exists places_user_idx on places (user_id, created_at desc);

create table if not exists payouts (
  id text primary key,
  user_id text not null,
  amount_cents integer not null,
  phone text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists payouts_user_idx on payouts (user_id, created_at desc);
