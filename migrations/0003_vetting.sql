create table if not exists cleaner_applications (
  user_id text primary key,
  legal_name text not null default '',
  phone text not null default '',
  city text not null default '',
  dob text not null default '',
  id_type text not null default 'national_id',
  id_number text not null default '',
  id_expiry text not null default '',
  conduct_issued text not null default '',
  profile_photo text not null default '',
  id_front text not null default '',
  id_back text not null default '',
  good_conduct text not null default '',
  selfie text not null default '',
  status text not null default 'draft',
  staff_note text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  updated_at timestamptz not null default now()
);
create index if not exists cleaner_applications_status_idx on cleaner_applications (status);
