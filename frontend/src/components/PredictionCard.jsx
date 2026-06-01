import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Zap, BarChart2, RefreshCw } from "lucide-react";
import { api } from "../utils/api.js";

const DIR_CONFIG = {
  UP:   { icon: TrendingUp,   color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30",  label: "BULLISH" },
  DOWN: { icon: TrendingDown, color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30",    label: "BEARISH" },
  HOLD: { icon: Minus,        color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "NEUTRAL" },
};

export default function PredictionCard({ symbol }) {
  const [pred, setPred]       = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Reset when symbol changes
  useEffect(() => {
    setPred(null);
    setHistory(null);
    setError(null);
    // Auto-load existing predictions
    api.predictions(symbol)
      .then((h) => {
        setHistory(h);
        // Pre-populate from most recent saved prediction
        if (h.history?.length) {
          const last = h.history[0];
          setPred({
            symbol:         last.symbol,
            targetDate:     last.target_date,
            direction:      last.direction,
            confidence:     Math.round(last.confidence * 100),
            currentPrice:   last.predicted_price, // best proxy we have cached
            predictedPrice: last.predicted_price,
            signals:        [],
            scores:         null,
            cached:         true,
          });
        }
      })
      .catch(() => {});
  }, [symbol]);

  async function runPrediction() {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([api.predict(symbol), api.predictions(symbol)]);
      setPred(p);
      setHistory(h);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cfg  = pred ? DIR_CONFIG[pred.direction] : null;
  const Icon = cfg?.icon;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" /> AI Prediction
        </h2>
        <button
          onClick={runPrediction}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <><RefreshCw size={11} className="animate-spin" /> Running…</>
          ) : (
            <><Zap size={11} /> {pred?.cached ? "Re-run" : "Run Prediction"}</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {!pred && !loading && !error && (
        <div className="text-center py-8 text-muted text-sm space-y-1">
          <Zap size={24} className="mx-auto text-border mb-2" />
          <p>Click "Run Prediction" to generate</p>
          <p className="text-xs">an AI signal for {symbol}</p>
        </div>
      )}

      {pred && cfg && (
        <>
          {pred.cached && (
            <p className="text-xs text-muted text-center -mb-2">
              Showing last saved prediction · Click Re-run for fresh signal
            </p>
          )}

          {/* Direction banner */}
          <div className={`flex items-center gap-4 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
            <div className={`p-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
              <Icon size={28} className={cfg.color} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-muted mt-0.5">
                Target: {pred.targetDate}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-white tabular-nums">{pred.confidence}%</div>
              <div className="text-xs text-muted">confidence</div>
            </div>
          </div>

          {/* Price boxes */}
          {!pred.cached && pred.currentPrice && (
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Current",  `$${pred.currentPrice?.toFixed(2)}`,   "text-white"],
                ["Target",   `$${pred.predictedPrice?.toFixed(2)}`,  cfg.color],
                ["Signals",  `${pred.signals?.length ?? 0} active`,  "text-blue-400"],
              ].map(([label, val, cls]) => (
                <div key={label} className="bg-bg rounded-lg p-2.5 text-center">
                  <div className={`text-sm font-bold ${cls} tabular-nums`}>{val}</div>
                  <div className="text-xs text-muted mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Signal score bar */}
          {pred.scores && (
            <div>
              <div className="text-xs text-muted mb-1.5">Signal breakdown</div>
              <div className="flex rounded-full overflow-hidden h-2">
                <div className="bg-green-400 transition-all" style={{ width: `${pred.scores.up}%` }} />
                <div className="bg-yellow-400 transition-all" style={{ width: `${pred.scores.hold}%` }} />
                <div className="bg-red-400 transition-all"   style={{ width: `${pred.scores.down}%` }} />
              </div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-green-400">↑ Bull {pred.scores.up}%</span>
                <span className="text-yellow-400">— Hold {pred.scores.hold}%</span>
                <span className="text-red-400">↓ Bear {pred.scores.down}%</span>
              </div>
            </div>
          )}

          {/* Active signals */}
          {!pred.cached && pred.signals?.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Active signals</div>
              <div className="flex flex-wrap gap-1.5">
                {pred.signals.map((sig, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded-full text-xs border ${cfg.border} ${cfg.color} ${cfg.bg}`}
                  >
                    {sig.name || sig}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Accuracy stats */}
      {history?.accuracy?.total > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <BarChart2 size={12} />
            Model Accuracy — {history.accuracy.total} resolved predictions
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold tabular-nums ${
              history.accuracy.accuracy_pct >= 55 ? "text-green-400"
              : history.accuracy.accuracy_pct >= 45 ? "text-yellow-400"
              : "text-red-400"
            }`}>
              {history.accuracy.accuracy_pct}%
            </span>
            <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  history.accuracy.accuracy_pct >= 55 ? "bg-green-400"
                  : history.accuracy.accuracy_pct >= 45 ? "bg-yellow-400"
                  : "bg-red-400"
                }`}
                style={{ width: `${history.accuracy.accuracy_pct}%` }}
              />
            </div>
            <span className="text-xs text-muted tabular-nums">
              {history.accuracy.correct ?? 0}/{history.accuracy.total}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-bg rounded p-1.5">
              <div className="text-green-400 font-bold">{history.accuracy.up_count}</div>
              <div className="text-muted">Bull calls</div>
            </div>
            <div className="bg-bg rounded p-1.5">
              <div className="text-yellow-400 font-bold">{history.accuracy.hold_count}</div>
              <div className="text-muted">Hold calls</div>
            </div>
            <div className="bg-bg rounded p-1.5">
              <div className="text-red-400 font-bold">{history.accuracy.down_count}</div>
              <div className="text-muted">Bear calls</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted/60 border-t border-border pt-3 text-center">
        ⚠ For educational purposes only. Not financial advice.
      </p>
    </div>
  );
}
