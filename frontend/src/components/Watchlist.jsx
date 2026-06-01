import { Star, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useWatchlist } from "../hooks/useStock.js";

export default function Watchlist({ onSelect, activeSymbol }) {
  const { quotes, loading, remove } = useWatchlist();

  if (loading && !quotes.length) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-xs text-muted mb-3 flex items-center gap-2">
          <Star size={12} className="text-yellow-400" /> WATCHLIST
        </div>
        <div className="text-xs text-muted text-center py-4">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="text-xs font-semibold text-muted mb-3 flex items-center gap-2">
        <Star size={12} className="text-yellow-400" /> WATCHLIST
        {quotes.length > 0 && <span className="ml-auto text-muted">{quotes.length} symbols</span>}
      </div>

      {quotes.length === 0 && (
        <p className="text-xs text-muted text-center py-4">
          Search for a stock and add it to your watchlist
        </p>
      )}

      <div className="space-y-1">
        {quotes.map((q) => {
          const isUp     = q.changePct >= 0;
          const isActive = q.symbol === activeSymbol;
          return (
            <div
              key={q.symbol}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                isActive ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-border/50"
              }`}
              onClick={() => onSelect({ symbol: q.symbol, name: q.name })}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{q.symbol}</div>
                <div className="text-xs text-muted truncate">{q.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-medium text-white">
                  ${q.price?.toFixed(2)}
                </div>
                <div className={`text-xs flex items-center gap-0.5 justify-end ${isUp ? "text-green-400" : "text-red-400"}`}>
                  {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isUp ? "+" : ""}{q.changePct?.toFixed(2)}%
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(q.symbol); }}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
