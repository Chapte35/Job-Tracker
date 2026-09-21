-- Activer pg_cron (disponible sur tous les projets Supabase)
create extension if not exists pg_cron;

-- Déclencher la Edge Function send-follow-ups tous les jours à 8h UTC
select cron.schedule(
  'send-follow-ups-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-follow-ups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
