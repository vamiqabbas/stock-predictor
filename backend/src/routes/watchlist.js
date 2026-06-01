import { Router } from "express";
import db from "../db/database.js";
import { fetchAndStoreHistory, getQuote, getPriceHistory } from "../services/marketData.js";
import { computeAndStoreIndicators } from "../services/indicators.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM watchlist ORDER BY added_at DESC").all([]));
});

router.post("/", async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: "symbol required" });

    const upper = symbol.toUpperCase();
    const quote = await getQuote(upper);
    const name = quote.longName || quote.shortName || upper;

    db.prepare("INSERT OR IGNORE INTO watchlist (symbol, name) VALUES (?, ?)").run([upper, name]);

    fetchAndStoreHistory(upper, "1y").then(() => {
      const rows = getPriceHistory(upper, 365);
      computeAndStoreIndicators(upper, rows);
    });

    res.json({ symbol: upper, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:symbol", (req, res) => {
  db.prepare("DELETE FROM watchlist WHERE symbol = ?").run([req.params.symbol.toUpperCase()]);
  res.json({ ok: true });
});

router.get("/quotes", async (req, res) => {
  try {
    const items = db.prepare("SELECT symbol FROM watchlist").all([]);
    const quotes = await Promise.allSettled(
      items.map(async ({ symbol }) => {
        const q = await getQuote(symbol);
        return {
          symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePct: q.regularMarketChangePercent,
          name: q.longName || q.shortName || symbol,
        };
      })
    );
    res.json(quotes.filter((r) => r.status === "fulfilled").map((r) => r.value));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
