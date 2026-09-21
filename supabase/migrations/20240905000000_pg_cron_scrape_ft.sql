-- Déclencher le scrape France Travail tous les jours à 7h UTC
select cron.schedule(
  'scrape-france-travail-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scrape-france-travail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
