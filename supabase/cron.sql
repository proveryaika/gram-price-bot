-- Run once in Supabase SQL Editor AFTER creating these Vault secrets:
-- gram_price_function_url = https://<PROJECT_REF>.supabase.co/functions/v1/gram-price
-- gram_price_cron_secret = the same value as the Edge Function CRON_SECRET
--
-- Telegram token belongs ONLY in Edge Function secrets:
-- TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID=@gram_ton9, CRON_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select cron.unschedule('gram-price-every-2-minutes')
where exists (
  select 1 from cron.job where jobname = 'gram-price-every-2-minutes'
);

select cron.schedule(
  'gram-price-every-2-minutes',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret
            from vault.decrypted_secrets
            where name = 'gram_price_function_url'
            limit 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'gram_price_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
