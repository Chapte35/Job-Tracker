-- Ajouter les colonnes de pertinence sur offers
alter table offers
  add column if not exists relevance_score smallint check (relevance_score between 1 and 10),
  add column if not exists relevance_summary text;

create index if not exists offers_relevance_idx on offers (relevance_score desc nulls last);
