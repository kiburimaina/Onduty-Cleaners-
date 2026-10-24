alter table jobs add column if not exists status_at timestamptz;
alter table jobs add column if not exists pieces text not null default '[]';
alter table jobs add column if not exists offer text not null default 'wash';
alter table jobs add column if not exists leg text not null default 'pickup';
update jobs set status_at = coalesce(updated_at, created_at, now()) where status_at is null;
