create table if not exists profiles (
  user_id text primary key,
  name text not null default '',
  role text not null default 'customer',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id text primary key,
  customer_id text not null,
  customer_name text not null default '',
  cleaner_id text,
  cleaner_name text,
  service_id text not null,
  size text not null,
  when_kind text not null,
  scheduled_for text,
  address text not null,
  notes text not null default '',
  status text not null,
  eta_minutes double precision not null default 10,
  travel_progress double precision not null default 0,
  clean_progress double precision not null default 0,
  price_cents integer not null,
  hours double precision not null,
  rating integer,
  tip_cents integer not null default 0,
  checklist text not null default '[]',
  laundry_mode text,
  laundry_load text,
  plant_id text,
  add_laundry boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_customer_idx on jobs (customer_id);
create index if not exists jobs_cleaner_idx on jobs (cleaner_id);
create index if not exists jobs_status_idx on jobs (status);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null,
  job_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists wallets (
  user_id text primary key,
  brand text not null default 'visa',
  last4 text not null default '',
  exp_month integer not null default 12,
  exp_year integer not null default 2028,
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id text primary key,
  user_id text not null,
  job_id text,
  amount_cents integer not null,
  status text not null,
  method text not null default 'card',
  brand text,
  last4 text,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on payments (user_id, created_at desc);

create table if not exists disputes (
  id text primary key,
  job_id text not null,
  user_id text not null,
  reason text not null,
  detail text not null default '',
  status text not null default 'open',
  resolution text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id text primary key,
  user_id text not null,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists ticket_messages (
  id text primary key,
  ticket_id text not null,
  user_id text not null,
  from_ops boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

create table if not exists recurring (
  id text primary key,
  user_id text not null,
  service_id text not null,
  size text not null,
  laundry_mode text,
  laundry_load text,
  plant_id text,
  cadence text not null,
  address text not null,
  notes text not null default '',
  next_at text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists duty_status (
  user_id text primary key,
  online boolean not null default false,
  updated_at timestamptz not null default now()
);
