import { Router } from "express";
import {
  fetchAndStoreHistory,
  getQuote,
  searchSymbols,
  getPriceHistory,
} from "../services/marketData.js";
import {
  computeAndStoreIndicators,
  getLatestIndicators,
  getIndicatorHistory,
} from "../services/indicators.js";
import {
  generatePrediction,
  getLatestPrediction,
  getPredictionHistory,
  getAccuracyStats,
} from "../ml/predictor.js";
import db from "../db/database.js";

const router = Router();

// ── Search ────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await searchSymbols(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Quote (live price) ────────────────────────────────────────
router.get("/:symbol/quote", async (req, res) => {
  try {
    const sym   = req.params.symbol.toUpperCase();
    const quote = await getQuote(sym);

    // Fallback open/high/low from most recent cached bar when Yahoo meta omits them
    const lastBar = db.prepare(
      "SELECT open, high, low FROM price_history WHERE symbol=? ORDER BY date DESC LIMIT 1"
    ).get([sym]);

    res.json({
      symbol:      quote.symbol,
      name:        quote.longName || quote.shortName,
      price:       quote.regularMarketPrice,
      change:      quote.regularMarketChange,
      changePct:   quote.regularMarketChangePercent,
      open:        quote.regularMarketOpen  ?? lastBar?.open  ?? null,
      high:        quote.regularMarketDayHigh ?? lastBar?.high ?? null,
      low:         quote.regularMarketDayLow  ?? lastBar?.low  ?? null,
      volume:      quote.regularMarketVolume,
      marketCap:   quote.marketCap,
      pe:          quote.trailingPE,
      fiftyTwoHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoLow:  quote.fiftyTwoWeekLow,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Price History ─────────────────────────────────────────────
router.get("/:symbol/history", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = "1y", refresh } = req.query;

    if (refresh === "true") {
      await fetchAndStoreHistory(symbol, period);
      const rows = getPriceHistory(symbol, 365);
      computeAndStoreIndicators(symbol, rows);
    }

    const days = { "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730 }[period] || 365;
    let rows = getPriceHistory(symbol, days);

    if (!rows.length) {
      await fetchAndStoreHistory(symbol, period);
      rows = getPriceHistory(symbol, days);
      computeAndStoreIndicators(symbol, rows);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Indicators ────────────────────────────────────────────────
router.get("/:symbol/indicators", (req, res) => {
  try {
    const { symbol } = req.params;
    const { history } = req.query;
    if (history) {
      return res.json(getIndicatorHistory(symbol, 90));
    }
    const ind = getLatestIndicators(symbol);
    if (!ind) return res.status(404).json({ error: "No indicators found. Fetch history first." });
    res.json(ind);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Predict ───────────────────────────────────────────────────
router.post("/:symbol/predict", async (req, res) => {
  try {
    const { symbol } = req.params;
    let rows = getPriceHistory(symbol, 365);

    if (rows.length < 60) {
      await fetchAndStoreHistory(symbol, "1y");
      rows = getPriceHistory(symbol, 365);
      computeAndStoreIndicators(symbol, rows);
    }

    const prediction = generatePrediction(symbol, rows);
    if (!prediction) {
      return res.status(400).json({ error: "Not enough data to generate prediction." });
    }

    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prediction History + Accuracy ────────────────────────────
router.get("/:symbol/predictions", (req, res) => {
  try {
    const history = getPredictionHistory(req.params.symbol, 30);
    const accuracy = getAccuracyStats(req.params.symbol);
    res.json({ history, accuracy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Latest Prediction ─────────────────────────────────────────
router.get("/:symbol/prediction/latest", (req, res) => {
  try {
    const pred = getLatestPrediction(req.params.symbol);
    if (!pred) return res.status(404).json({ error: "No prediction yet." });
    res.json(pred);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
