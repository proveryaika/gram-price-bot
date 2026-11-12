# GRAM Price Bot

Telegram channel price publisher for the native coin of The Open Network (formerly Toncoin).

- Publishes a new Telegram message every 2 minutes (does not edit or delete previous posts).
- Reads USD and RUB prices plus 24-hour USD change from CoinGecko.
- Sends posts to @gram_ton9.
- Runs as a Supabase Edge Function triggered by Supabase Cron.

## Asset identity

CoinGecko API ID: the-open-network. This stable ID identifies the native coin of The Open Network. It is not an unrelated jetton that happens to use the GRAM ticker. Display name and ticker can vary while providers complete their rebrand updates.

## Deploy

1. Create a Supabase project.
2. Install Supabase CLI and log in.
3. Link this repository to the project:
   supabase link --project-ref YOUR_PROJECT_REF
4. Set Edge Function secrets (never commit these values):
   supabase secrets set TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN" TELEGRAM_CHANNEL_ID="@gram_ton9" CRON_SECRET="A_LONG_RANDOM_SECRET"
5. Deploy:
   supabase functions deploy gram-price --no-verify-jwt
6. In Supabase Dashboard, open SQL Editor. Store the function URL and the same cron secret in Vault:

   select vault.create_secret(
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/gram-price',
     'gram_price_function_url'
   );

   select vault.create_secret(
     'REPLACE_WITH_THE_SAME_LONG_RANDOM_SECRET',
     'gram_price_cron_secret'
   );

7. Run the SQL in supabase/cron.sql in SQL Editor. It schedules the function every 2 minutes.

## Test

From Supabase Dashboard > Edge Functions > gram-price, invoke the function with:
- Method: POST
- Header: x-cron-secret: YOUR_LONG_RANDOM_SECRET
- Body: {}

The bot must already be an administrator of @gram_ton9 with permission to post messages.

## Notes

- CoinGecko's public API is rate-limited and availability is not guaranteed. The function returns an error and does not publish if a valid quote cannot be fetched.
- RUB is fetched directly from CoinGecko, not calculated from a separate USD/FX quote.
- Prices are informational and may be delayed.
- Keep the Telegram bot token and cron secret out of GitHub. Use Supabase secrets and Vault only.
