import { useState } from "react";
import { TrendingUp, TrendingDown, Plus, Check, RefreshCw } from "lucide-react";
import { useQuote } from "../hooks/useStock.js";
import { api } from "../utils/api.js";

function fmt(val, prefix = "$", fallback = "—") {
  if (val == null || isNaN(val)) return fallback;
  return prefix + val.toFixed(2);
}

function fmtLarge(val) {
  if (val == null) return "—";
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

export default function QuoteHeader({ symbol, name, onAddedToWatchlist }) {
  const { data: q, loading, error } = useQuote(symbol);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addToWatchlist() {
    setAdding(true);
    try {
      await api.addToWatchlist(symbol);
      setAdded(true);
      onAddedToWatchlist?.();
      setTimeout(() => setAdded(false), 3000);
    } finally {
      setAdding(false);
    }
  }

  const isUp = (q?.change ?? 0) >= 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">

        {/* Symbol + name + add button */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{symbol}</h1>
              {loading && <RefreshCw size={14} className="text-blue-400 animate-spin" />}
              <button
                onClick={addToWatchlist}
                disabled={adding}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                  added
                    ? "bg-green-400/10 border-green-400/30 text-green-400"
                    : "border-border text-muted hover:text-white hover:border-blue-400/50"
                }`}
              >
                {added ? <><Check size={11} /> Added</> : <><Plus size={11} /> Watchlist</>}
              </button>
            </div>
            <p className="text-sm text-muted mt-0.5 truncate">{name || q?.name || symbol}</p>
          </div>
        </div>

        {/* Price block */}
        {q && (
          <div className="flex flex-wrap gap-6 items-start">
            <div>
              <div className="text-3xl font-bold font-mono text-white tabular-nums">
                ${q.price?.toFixed(2) ?? "—"}
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold mt-1 ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isUp ? "+" : ""}{fmt(q.change, "")}
                <span className="ml-0.5">({isUp ? "+" : ""}{q.changePct?.toFixed(2) ?? "0.00"}%)</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
              {[
                ["Open",     fmt(q.open)],
                ["High",     fmt(q.high)],
                ["Low",      fmt(q.low)],
                ["Volume",   q.volume ? `${(q.volume / 1e6).toFixed(1)}M` : "—"],
                ["Mkt Cap",  fmtLarge(q.marketCap)],
                ["P/E",      q.pe ? q.pe.toFixed(1) : "—"],
                ["52W High", fmt(q.fiftyTwoHigh)],
                ["52W Low",  fmt(q.fiftyTwoLow)],
              ].map(([lbl, val]) => (
                <div key={lbl} className="flex items-center gap-1">
                  <span className="text-muted">{lbl}</span>
                  <span className="text-white font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs">Failed to load quote: {error}</p>
        )}
      </div>
    </div>
  );
}
