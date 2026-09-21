-- =============================================================
-- Migration : AI features — résumé offre + profil candidat
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1. Colonnes IA sur offers
-- -------------------------------------------------------------

-- Résumé TL;DR généré par Ollama (3-4 bullet points)
alter table offers
  add column if not exists ai_offer_summary text,

-- Infos clés extraites sous forme JSON structuré
-- { stack: string[], level: string, remote: string, salary: string }
  add column if not exists ai_key_info      jsonb,

-- Timestamp de la dernière analyse IA (résumé offre)
  add column if not exists ai_analyzed_at   timestamptz;

-- Index pour filtrer les offres non-analysées rapidement
create index if not exists offers_ai_analyzed_at_idx on offers (ai_analyzed_at);

-- -------------------------------------------------------------
-- 2. Table candidate_profile (singleton — une seule ligne)
-- -------------------------------------------------------------

create table if not exists candidate_profile (
  id              uuid primary key default gen_random_uuid(),

  -- Champs structurés
  full_name       text not null default 'Sébastien Laloë',
  title           text not null default 'Développeur Full-Stack',
  location        text not null default 'Rennes + télétravail',
  availability    text not null default 'AT ou forfait',

  -- Stacks (arrays pour faciliter le matching)
  stack_backend   text[] not null default '{}',
  stack_frontend  text[] not null default '{}',
  stack_mobile    text[] not null default '{}',
  stack_ai        text[] not null default '{}',
  stack_devops    text[] not null default '{}',

  -- Préférences
  mission_types   text[] not null default '{}',   -- ex: ['CDI', 'Freelance', 'Alternance']
  not_interested  text[] not null default '{}',   -- ex: ['support', 'sysadmin']
  experience_years int not null default 2,

  -- Texte libre (généré depuis les champs ci-dessus, éditable)
  free_text       text not null default '',

  -- Méta
  updated_at      timestamptz not null default now()
);

-- Trigger updated_at
create trigger candidate_profile_updated_at
  before update on candidate_profile
  for each row execute function set_updated_at();

-- Insérer le profil par défaut (ne s'exécute que si la table est vide)
insert into candidate_profile (
  full_name,
  title,
  location,
  availability,
  stack_backend,
  stack_frontend,
  stack_mobile,
  stack_ai,
  stack_devops,
  mission_types,
  not_interested,
  experience_years,
  free_text
)
select
  'Sébastien Laloë',
  'Développeur Full-Stack',
  'Rennes + télétravail',
  'AT ou forfait',
  array['Spring Boot', 'Node.js', 'Express', 'PostgreSQL'],
  array['React', 'Next.js', 'TypeScript', 'Angular'],
  array['React Native', 'Ionic', 'Expo'],
  array['N8N', 'MistralAI', 'GPT-4o', 'Ollama'],
  array['Docker', 'GitLab CI/CD', 'Jenkins'],
  array['CDI', 'Freelance', 'Mission AT'],
  array['support', 'sysadmin pur', 'langages exotiques'],
  2,
  'Développeur Full-Stack Mobile iOS/Android avec une expérience en production Web sur Java / Spring Boot, Angular et React. J''interviens en mission aussi bien sur une application page blanche, des évolutions, ou de la dette technique. Une appétence pour l''intégration IA dans les workflows métier.'
where not exists (select 1 from candidate_profile);
