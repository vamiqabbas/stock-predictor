import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { api } from "../utils/api.js";

export default function SearchBar({ onSelect }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await api.search(query);
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, [query]);

  function select(item) {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(item);
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
        <Search size={16} className="text-muted shrink-0" />
        <input
          className="bg-transparent outline-none flex-1 text-sm text-white placeholder-muted"
          placeholder="Search stocks — AAPL, TSLA, MSFT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")}>
            <X size={14} className="text-muted hover:text-white" />
          </button>
        )}
        {loading && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-border/50 transition-colors text-left"
              onClick={() => select(r)}
            >
              <span className="text-sm font-semibold text-white">{r.symbol}</span>
              <span className="text-xs text-muted truncate ml-3">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
