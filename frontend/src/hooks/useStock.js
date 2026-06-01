import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api.js";

export function useQuote(symbol) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    api.quote(symbol)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading, error };
}

export function useHistory(symbol, period = "1y") {
  const [data, setData]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    api.history(symbol, period, true)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    api.history(symbol, period)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  return { data, loading, error, refresh };
}

export function useWatchlist() {
  const [items, setItems]     = useState([]);
  const [quotes, setQuotes]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, qs] = await Promise.all([api.watchlist(), api.watchlistQuotes()]);
      setItems(list);
      setQuotes(qs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (symbol) => {
    await api.addToWatchlist(symbol);
    load();
  };

  const remove = async (symbol) => {
    await api.removeFromWatchlist(symbol);
    load();
  };

  return { items, quotes, loading, add, remove, refresh: load };
}
