const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

export const api = {
  search: (q) => req(`/stocks/search?q=${encodeURIComponent(q)}`),
  quote: (sym) => req(`/stocks/${sym}/quote`),
  history: (sym, period = "1y", refresh = false) =>
    req(`/stocks/${sym}/history?period=${period}&refresh=${refresh}`),
  indicators: (sym) => req(`/stocks/${sym}/indicators`),
  indicatorHistory: (sym) => req(`/stocks/${sym}/indicators?history=true`),
  predict: (sym) => req(`/stocks/${sym}/predict`, { method: "POST" }),
  latestPrediction: (sym) => req(`/stocks/${sym}/prediction/latest`),
  predictions: (sym) => req(`/stocks/${sym}/predictions`),

  watchlist: () => req(`/watchlist`),
  watchlistQuotes: () => req(`/watchlist/quotes`),
  addToWatchlist: (symbol) => req(`/watchlist`, { method: "POST", body: JSON.stringify({ symbol }) }),
  removeFromWatchlist: (sym) => req(`/watchlist/${sym}`, { method: "DELETE" }),
};
