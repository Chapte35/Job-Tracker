-- =============================================================
-- Migration : ajout phone + mail_signature sur candidate_profile
-- =============================================================

alter table candidate_profile
  add column if not exists phone          text not null default '',
  add column if not exists mail_signature text not null default '';

-- Valeur par défaut pour la ligne existante
update candidate_profile
set
  phone = '06 XX XX XX XX',
  mail_signature = 'Sébastien Laloë
Développeur Full-Stack — EI · SIREN 108 791 427
chapte.dev'
where phone = '';
