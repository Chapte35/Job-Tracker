-- Ajouter la colonne starred sur offers
alter table offers add column if not exists starred boolean not null default false;
create index if not exists offers_starred_idx on offers (starred) where starred = true;
