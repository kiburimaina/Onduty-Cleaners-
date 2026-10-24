alter table recurring add column if not exists offer text not null default 'wash';
alter table recurring add column if not exists pieces text not null default '[]';
alter table recurring add column if not exists add_laundry boolean not null default false;
