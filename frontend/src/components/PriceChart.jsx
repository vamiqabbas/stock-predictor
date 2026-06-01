import { useState, useEffect } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useHistory } from "../hooks/useStock.js";
import { sma } from "../utils/indicators.js";
import { RefreshCw } from "lucide-react";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y"];

function fmtDate(dateStr, period) {
  const d = new Date(dateStr);
  if (period === "1mo") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (period === "2y")  return d.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#1C2128] border border-[#30363D] rounded-lg p-3 text-xs shadow-2xl min-w-[160px]">
      <div className="text-muted font-medium mb-2">{d?.rawDate || label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Open</span>
          <span className="text-white font-mono">${d?.open?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">High</span>
          <span className="text-green-400 font-mono">${d?.high?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Low</span>
          <span className="text-red-400 font-mono">${d?.low?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Close</span>
          <span className="text-white font-mono font-bold">${d?.close?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="border-t border-border pt-1 mt-1 flex justify-between gap-4">
          <span className="text-muted">Vol</span>
          <span className="text-blue-400 font-mono">{d?.volume ? (d.volume / 1e6).toFixed(1) + "M" : "—"}</span>
        </div>
        {d?.sma20 && (
          <div className="flex justify-between gap-4">
            <span className="text-yellow-400">SMA20</span>
            <span className="font-mono text-yellow-400">${d.sma20.toFixed(2)}</span>
          </div>
        )}
        {d?.sma50 && (
          <div className="flex justify-between gap-4">
            <span className="text-purple-400">SMA50</span>
            <span className="font-mono text-purple-400">${d.sma50.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PriceChart({ symbol }) {
  const [period, setPeriod]       = useState("1y");
  const [showSMA, setShowSMA]     = useState(true);
  const { data, loading, refresh } = useHistory(symbol, period);

  // Reset period when symbol changes
  useEffect(() => { setPeriod("1y"); }, [symbol]);

  // Compute SMA overlays
  const closes = data.map((r) => r.close);
  const sma20arr = closes.map((_, i) => i < 19 ? null : sma(closes.slice(0, i + 1), 20));
  const sma50arr = closes.map((_, i) => i < 49 ? null : sma(closes.slice(0, i + 1), 50));

  const chartData = data.map((row, i) => ({
    ...row,
    rawDate: row.date,
    date:    fmtDate(row.date, period),
    sma20:   sma20arr[i],
    sma50:   sma50arr[i],
  }));

  const prices  = closes.filter(Boolean);
  const minP    = prices.length ? Math.min(...prices) * 0.97 : 0;
  const maxP    = prices.length ? Math.max(...prices) * 1.03 : 100;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Price History</h2>
          {/* SMA toggle */}
          <button
            onClick={() => setShowSMA((v) => !v)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              showSMA
                ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"
                : "border-border text-muted hover:text-white"
            }`}
          >
            SMA
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-muted hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 rounded border border-border text-muted hover:text-white transition-colors disabled:opacity-40"
            title="Refresh from Yahoo Finance"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="h-72 flex flex-col items-center justify-center gap-2 text-muted text-sm">
          <RefreshCw size={20} className="animate-spin text-blue-400" />
          Fetching data from Yahoo Finance…
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="space-y-1">
          {/* Price line chart */}
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(1, Math.floor(chartData.length / 7))}
              />
              <YAxis
                domain={[minP, maxP]}
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`}
                width={52}
                orientation="right"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Price line with gradient fill */}
              <Line
                type="monotone"
                dataKey="close"
                stroke="#58A6FF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#58A6FF", stroke: "#0D1117", strokeWidth: 2 }}
              />

              {/* SMA overlays */}
              {showSMA && (
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#F6C90E"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                  connectNulls
                />
              )}
              {showSMA && (
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="#BC8CFF"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Volume chart */}
          <ResponsiveContainer width="100%" height={52}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <YAxis hide orientation="right" width={52} />
              <Bar
                dataKey="volume"
                fill="#58A6FF"
                opacity={0.35}
                radius={[1, 1, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          {showSMA && (
            <div className="flex gap-4 pt-1 text-xs text-muted justify-end">
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-blue-400 inline-block" /> Close
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-yellow-400 inline-block border-dashed" /> SMA20
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-purple-400 inline-block" /> SMA50
              </span>
            </div>
          )}
        </div>
      )}

      {!loading && !chartData.length && (
        <div className="h-72 flex flex-col items-center justify-center gap-2 text-muted text-sm">
          <p>No data cached yet.</p>
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs hover:bg-blue-500/30 transition-colors"
          >
            Fetch from Yahoo Finance
          </button>
        </div>
      )}
    </div>
  );
}
