const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd,rub&include_24hr_change=true";

function formatPrice(value: number): string {
  const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const suppliedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || suppliedSecret !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const channel = Deno.env.get("TELEGRAM_CHANNEL_ID") ?? "@gram_ton9";
  if (!botToken) {
    return new Response("Missing TELEGRAM_BOT_TOKEN", { status: 500 });
  }

  try {
    const priceResponse = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!priceResponse.ok) {
      throw new Error("CoinGecko HTTP " + priceResponse.status);
    }

    const payload = await priceResponse.json();
    const coin = payload?.["the-open-network"];
    const usd = Number(coin?.usd);
    const rub = Number(coin?.rub);
    const change = Number(coin?.usd_24h_change);

    if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(rub) || rub <= 0) {
      throw new Error("CoinGecko returned an invalid price");
    }

    const now = new Date();
    const timestamp = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    const changeLine = Number.isFinite(change)
      ? "📊 <b>24ч:</b> " + formatChange(change) + "\n"
      : "";

    const message =
      "💎 <b>GRAM PRICE</b>\n\n" +
      "🇺🇸 <b>USD:</b> $" + formatPrice(usd) + "\n" +
      "🇷🇺 <b>RUB:</b> " + formatPrice(rub) + " ₽\n" +
      changeLine +
      "\n🕒 <b>Обновлено:</b> " + timestamp + " (МСК)\n" +
      "📡 <a href=\"https://www.coingecko.com/en/coins/the-open-network\">Источник: CoinGecko</a>";

    const telegramResponse = await fetch(
      "https://api.telegram.org/bot" + botToken + "/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );

    const telegramResult = await telegramResponse.json();
    if (!telegramResponse.ok || !telegramResult.ok) {
      throw new Error(
        "Telegram API error: " +
          (telegramResult.description ?? telegramResponse.status),
      );
    }

    return Response.json({
      ok: true,
      message_id: telegramResult.result.message_id,
      usd,
      rub,
      published_at: now.toISOString(),
    });
  } catch (error) {
    console.error("gram-price failed:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
});
