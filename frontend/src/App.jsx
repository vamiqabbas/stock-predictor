import { useState, useCallback } from "react";
import SearchBar       from "./components/SearchBar.jsx";
import Watchlist       from "./components/Watchlist.jsx";
import QuoteHeader     from "./components/QuoteHeader.jsx";
import PriceChart      from "./components/PriceChart.jsx";
import PredictionCard  from "./components/PredictionCard.jsx";
import IndicatorsPanel from "./components/IndicatorsPanel.jsx";
import { Activity, LayoutGrid } from "lucide-react";

const DEFAULT = { symbol: "AAPL", name: "Apple Inc." };
const TABS     = ["Chart", "Prediction", "Indicators"];

export default function App() {
  const [active, setActive]         = useState(DEFAULT);
  const [watchlistRev, setWatchlistRev] = useState(0);
  const [tab, setTab]               = useState("Chart");

  const handleSelect = useCallback((item) => {
    setActive(item);
    setTab("Chart");
  }, []);

  const refreshWatchlist = useCallback(() => {
    setWatchlistRev((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-white">

      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center gap-4 sticky top-0 bg-bg/95 backdrop-blur z-40">
        <div className="flex items-center gap-2 shrink-0">
          <Activity size={18} className="text-blue-400" />
          <span className="font-bold text-sm">StockPredictor</span>
          <span className="text-[10px] text-muted px-1.5 py-0.5 border border-border rounded tracking-wide">AI</span>
        </div>
        <SearchBar onSelect={handleSelect} />
        <div className="ml-auto text-xs text-muted hidden md:block shrink-0">
          Yahoo Finance · Ensemble ML
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex gap-4 p-4 max-w-screen-2xl mx-auto">

        {/* Left sidebar — watchlist, desktop only */}
        <aside className="w-60 shrink-0 hidden lg:block">
          <Watchlist key={watchlistRev} onSelect={handleSelect} activeSymbol={active?.symbol} />
        </aside>

        {/* Main column */}
        <main className="flex-1 min-w-0 space-y-4">
          {!active && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted text-sm">
              <LayoutGrid size={32} className="text-border" />
              Search for a stock symbol to get started
            </div>
          )}

          {active && (
            <>
              <QuoteHeader
                symbol={active.symbol}
                name={active.name}
                onAddedToWatchlist={refreshWatchlist}
              />

              {/* Mobile tab bar — hidden on xl where sidebar always shows */}
              <div className="flex gap-1 xl:hidden">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                      tab === t
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-surface border-border text-muted hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Chart — always visible on xl; tab-gated on smaller screens */}
              <div className={tab === "Chart" ? "" : "hidden xl:block"}>
                <PriceChart symbol={active.symbol} />
              </div>

              {/* Prediction — xl: hidden here (shown in sidebar); smaller: tab-gated */}
              <div className={`xl:hidden ${tab === "Prediction" ? "" : "hidden"}`}>
                <PredictionCard symbol={active.symbol} />
              </div>

              {/* Indicators — xl: hidden here (shown in sidebar); smaller: tab-gated */}
              <div className={`xl:hidden ${tab === "Indicators" ? "" : "hidden"}`}>
                <IndicatorsPanel symbol={active.symbol} />
              </div>
            </>
          )}
        </main>

        {/* Right sidebar — prediction + indicators, xl only */}
        <aside className="w-80 shrink-0 hidden xl:block space-y-4">
          {active && (
            <>
              <PredictionCard  symbol={active.symbol} />
              <IndicatorsPanel symbol={active.symbol} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
