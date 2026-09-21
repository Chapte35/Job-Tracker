-- =============================================================
-- job-tracker — Schéma Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- =============================================================

-- Extension pour les UUIDs
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- ENUM : source de l'offre
-- -------------------------------------------------------------
create type offer_source as enum (
  'france_travail',
  'welcome_to_the_jungle',
  'linkedin',
  'indeed',
  'manual'
);

-- -------------------------------------------------------------
-- ENUM : statut d'une offre (pipeline kanban)
-- -------------------------------------------------------------
create type offer_status as enum (
  'new',
  'to_apply',
  'ignored'
);

-- -------------------------------------------------------------
-- ENUM : statut d'une candidature
-- -------------------------------------------------------------
create type application_status as enum (
  'sent',
  'interview',
  'refused',
  'offer'
);

-- -------------------------------------------------------------
-- TABLE : offers
-- -------------------------------------------------------------
create table offers (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  title         text not null,
  company       text not null,
  location      text,
  salary        text,
  contract_type text,
  description   text,
  source        offer_source not null default 'manual',
  status        offer_status not null default 'new',
  scraped_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint offers_url_unique unique (url)
);

-- Index pour tri par date et filtrage par status
create index offers_status_idx on offers (status);
create index offers_scraped_at_idx on offers (scraped_at desc);

-- -------------------------------------------------------------
-- TABLE : cv_versions
-- -------------------------------------------------------------
create table cv_versions (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  file_path   text not null, -- chemin dans Supabase Storage bucket "cvs"
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- TABLE : applications
-- -------------------------------------------------------------
create table applications (
  id                  uuid primary key default gen_random_uuid(),
  offer_id            uuid not null references offers(id) on delete cascade,
  cv_version_id       uuid references cv_versions(id) on delete set null,
  email_to            text not null,
  subject             text not null,
  body                text not null,
  status              application_status not null default 'sent',
  sent_at             timestamptz not null default now(),
  follow_up_delay_days int not null default 7, -- configurable par candidature
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint applications_offer_unique unique (offer_id) -- une seule candidature par offre
);

create index applications_status_idx on applications (status);
create index applications_sent_at_idx on applications (sent_at desc);

-- -------------------------------------------------------------
-- TABLE : follow_ups
-- -------------------------------------------------------------
create table follow_ups (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  scheduled_at    timestamptz not null,
  sent_at         timestamptz,
  subject         text,
  body            text,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  created_at      timestamptz not null default now()
);

create index follow_ups_scheduled_at_idx on follow_ups (scheduled_at);
create index follow_ups_status_idx on follow_ups (status);

-- -------------------------------------------------------------
-- FUNCTION : updated_at auto-update trigger
-- -------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger offers_updated_at
  before update on offers
  for each row execute function set_updated_at();

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- -------------------------------------------------------------
-- STORAGE : bucket pour les CVs
-- -------------------------------------------------------------
-- À exécuter séparément dans Storage > New bucket
-- Nom : cvs, Public : false
-- insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false);
