// Yahoo Finance v8 chart API — direct fetch, no npm package needed
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry: tries query1 first, on 429 waits 2s and falls back to query2.
 */
async function fetchWithRetry(url) {
  let res = await fetch(url, { headers: HEADERS });
  if (res.status === 429) {
    await sleep(2000);
    res = await fetch(url.replace("query1", "query2"), { headers: HEADERS });
  }
  if (!res.ok) {
    throw new Error(`Yahoo Finance ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * Fetch historical OHLCV data.
 * @param {string} symbol
 * @param {string} range  e.g. "1y", "2y", "6mo", "3mo", "1mo"
 * @returns {Array<{date,open,high,low,close,volume,adjClose}>}
 */
export async function getHistorical(symbol, range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=1d&includePrePost=false`;

  const data = await fetchWithRetry(url);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for ${symbol}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adjcloseArr = result.indicators?.adjclose?.[0]?.adjclose || [];

  const rows = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    if (close == null) continue; // filter out null closes

    const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
    rows.push({
      date,
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close,
      volume: quote.volume?.[i] ?? null,
      adjClose: adjcloseArr[i] ?? close,
    });
  }

  return rows;
}

/**
 * Get current quote data for a symbol.
 * @param {string} symbol
 * @returns quote object with price, change, etc.
 */
export async function getQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1d&interval=1d`;

  const data = await fetchWithRetry(url);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No quote data returned for ${symbol}`);
  }

  const meta = result.meta || {};
  const change = (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0);
  const changePct =
    meta.chartPreviousClose
      ? (change / meta.chartPreviousClose) * 100
      : 0;

  // Fallback open from first intraday bar when meta doesn't include it
  const q0 = result.indicators?.quote?.[0];
  const barOpen = q0?.open?.[0] ?? null;

  return {
    symbol: meta.symbol || symbol.toUpperCase(),
    longName: meta.longName || null,
    shortName: meta.shortName || null,
    regularMarketPrice: meta.regularMarketPrice ?? null,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketOpen: meta.regularMarketOpen ?? barOpen,
    regularMarketDayHigh: meta.regularMarketDayHigh ?? null,
    regularMarketDayLow: meta.regularMarketDayLow ?? null,
    regularMarketVolume: meta.regularMarketVolume ?? null,
    marketCap: meta.marketCap ?? null,
    trailingPE: meta.trailingPE ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
  };
}

/**
 * Search for stock symbols by query string.
 * @param {string} query
 * @returns {Array<{symbol, name}>}
 */
export async function searchSymbols(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&lang=en-US&region=US&quotesCount=10&newsCount=0`;

  const data = await fetchWithRetry(url);
  const quotes = data?.quotes || [];

  return quotes
    .filter((q) => q.quoteType === "EQUITY")
    .slice(0, 10)
    .map((q) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
    }));
}
