import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { api } from "../utils/api.js";

function GaugeBar({ value, min = 0, max = 100, colorClass }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="w-full bg-bg rounded-full h-1 mt-1 overflow-hidden">
      <div className={`h-1 rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function rsiColor(v) {
  if (v >= 70) return "text-red-400";
  if (v <= 30) return "text-green-400";
  return "text-white";
}
function rsiLabel(v) {
  if (v >= 70) return "Overbought";
  if (v <= 30) return "Oversold";
  if (v >= 55) return "Bullish";
  if (v <= 45) return "Bearish";
  return "Neutral";
}
function rsiGaugeColor(v) {
  if (v >= 70) return "bg-red-400";
  if (v <= 30) return "bg-green-400";
  return "bg-blue-400";
}

function fmt(v, prefix = "$") {
  if (v == null || isNaN(v)) return "—";
  return prefix + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(2));
}

export default function IndicatorsPanel({ symbol }) {
  const [ind, setInd]     = useState(null);
  const [loading, setL]   = useState(false);
  const [error, setError] = useState(null);

  async function load(forceRefresh = false) {
    if (!symbol) return;
    setL(true);
    setError(null);
    try {
      if (forceRefresh) {
        // Fetch fresh history first, which also recomputes indicators server-side
        await api.history(symbol, "1y", true);
      }
      const data = await api.indicators(symbol);
      setInd(data);
    } catch (e) {
      setError(e.message);
      setInd(null);
    } finally {
      setL(false);
    }
  }

  // Auto-load whenever symbol changes; auto-fetch history if no indicators
  useEffect(() => {
    setInd(null);
    setError(null);
    if (!symbol) return;
    setL(true);
    api.indicators(symbol)
      .then(setInd)
      .catch(() => {
        // No indicators yet — trigger a background history fetch
        load(true);
      })
      .finally(() => setL(false));
  }, [symbol]);

  const rows = ind ? [
    {
      label: "RSI (14)",
      value: ind.rsi14 != null ? ind.rsi14.toFixed(1) : "—",
      sub: ind.rsi14 != null ? rsiLabel(ind.rsi14) : null,
      color: ind.rsi14 != null ? rsiColor(ind.rsi14) : "text-white",
      gauge: ind.rsi14 != null ? <GaugeBar value={ind.rsi14} colorClass={rsiGaugeColor(ind.rsi14)} /> : null,
    },
    { label: "SMA 20",       value: fmt(ind.sma20),          sub: null },
    { label: "SMA 50",       value: fmt(ind.sma50),          sub: null },
    { label: "SMA 200",      value: fmt(ind.sma200),         sub: null },
    { label: "EMA 20",       value: fmt(ind.ema20),          sub: null },
    {
      label: "MACD",
      value: ind.macd != null ? ind.macd.toFixed(3) : "—",
      sub: ind.macd != null ? (ind.macd > 0 ? "Bullish" : "Bearish") : null,
      color: ind.macd != null ? (ind.macd > 0 ? "text-green-400" : "text-red-400") : "text-white",
    },
    { label: "MACD Signal",  value: ind.macd_signal != null ? ind.macd_signal.toFixed(3) : "—", sub: null },
    { label: "MACD Hist",    value: ind.macd_hist   != null ? ind.macd_hist.toFixed(3)   : "—",
      color: ind.macd_hist != null ? (ind.macd_hist > 0 ? "text-green-400" : "text-red-400") : "text-white",
      sub: null },
    { label: "BB Upper",     value: fmt(ind.bb_upper),       sub: null },
    { label: "BB Mid",       value: fmt(ind.bb_mid),         sub: null },
    { label: "BB Lower",     value: fmt(ind.bb_lower),       sub: null },
    { label: "ATR (14)",     value: ind.atr14 != null ? `$${ind.atr14.toFixed(2)}` : "—",  sub: "Volatility" },
    { label: "OBV",          value: ind.obv  != null ? `${(ind.obv / 1e6).toFixed(1)}M`  : "—", sub: "Vol flow" },
  ] : [];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity size={14} className="text-purple-400" /> Indicators
          {ind?.date && <span className="text-xs text-muted font-normal ml-1">{ind.date}</span>}
        </h2>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="p-1.5 rounded border border-border text-muted hover:text-white transition-colors disabled:opacity-40"
          title="Refresh indicators"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 gap-2 text-muted text-sm">
          <RefreshCw size={16} className="animate-spin text-purple-400" />
          Computing indicators…
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs hover:bg-purple-500/30 transition-colors"
          >
            Fetch Data & Compute
          </button>
        </div>
      )}

      {!loading && !error && !ind && (
        <div className="text-center py-6 space-y-2">
          <Activity size={24} className="mx-auto text-border mb-1" />
          <p className="text-xs text-muted">Fetching price data to compute indicators…</p>
        </div>
      )}

      {!loading && ind && (
        <div className="space-y-0.5">
          {rows.map(({ label, value, sub, color, gauge }) => (
            <div
              key={label}
              className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0"
            >
              <div className="min-w-0">
                <span className="text-xs text-muted">{label}</span>
                {sub && (
                  <span className={`text-xs ml-1.5 ${color || "text-muted"}`}>{sub}</span>
                )}
                {gauge}
              </div>
              <span className={`text-xs font-mono font-semibold ml-3 tabular-nums ${color || "text-white"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
