import db from "../db/database.js";
import { sma, ema, rsi, macd, bollingerBands, atr } from "../services/indicators.js";

function buildFeatures(rows) {
  if (rows.length < 60) return null;

  const closes = rows.map((r) => r.close);
  const last = closes[closes.length - 1];

  const sma20v = sma(closes, 20);
  const sma50v = sma(closes, 50);
  const ema20v = ema(closes, 20);
  const rsi14 = rsi(closes, 14);
  const bb = bollingerBands(closes, 20);
  const mc = macd(closes);
  const atr14 = atr(rows, 14);

  const priceVsSma20 = sma20v ? (last - sma20v) / sma20v : 0;
  const priceVsSma50 = sma50v ? (last - sma50v) / sma50v : 0;
  const priceVsEma20 = ema20v ? (last - ema20v) / ema20v : 0;
  const sma20VsSma50 = sma20v && sma50v ? (sma20v - sma50v) / sma50v : 0;

  const bbRange = bb.upper && bb.lower ? bb.upper - bb.lower : 1;
  const bbPos = bb.lower ? Math.max(0, Math.min(1, (last - bb.lower) / bbRange)) : 0.5;

  const ret1d =
    rows.length > 1 ? (last - closes[closes.length - 2]) / closes[closes.length - 2] : 0;
  const ret5d =
    rows.length > 5 ? (last - closes[closes.length - 6]) / closes[closes.length - 6] : 0;
  const ret20d =
    rows.length > 20 ? (last - closes[closes.length - 21]) / closes[closes.length - 21] : 0;

  const returns20 = closes
    .slice(-21)
    .map((c, i, arr) => (i > 0 ? (c - arr[i - 1]) / arr[i - 1] : 0))
    .slice(1);
  const meanRet = returns20.reduce((a, b) => a + b, 0) / returns20.length;
  const volatility = Math.sqrt(
    returns20.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns20.length
  );

  const vols = rows.map((r) => r.volume).filter(Boolean);
  const vol5avg = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const vol20avg = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = vol20avg > 0 ? vol5avg / vol20avg : 1;

  return {
    rsi14: rsi14 ?? 50,
    priceVsSma20,
    priceVsSma50,
    priceVsEma20,
    sma20VsSma50,
    bbPos,
    macdHist: mc.hist ?? 0,
    ret1d,
    ret5d,
    ret20d,
    volatility,
    volRatio,
    atr14Pct: atr14 ? atr14 / last : 0,
  };
}

function predictDirection(features) {
  const signals = [];

  if (features.rsi14 < 30) signals.push({ dir: "UP", weight: 2.0, name: "RSI oversold" });
  else if (features.rsi14 > 70) signals.push({ dir: "DOWN", weight: 2.0, name: "RSI overbought" });
  else if (features.rsi14 < 45) signals.push({ dir: "UP", weight: 0.8, name: "RSI mild bullish" });
  else if (features.rsi14 > 55) signals.push({ dir: "DOWN", weight: 0.8, name: "RSI mild bearish" });
  else signals.push({ dir: "HOLD", weight: 0.5, name: "RSI neutral" });

  if (features.priceVsSma20 > 0.02) signals.push({ dir: "UP", weight: 1.2, name: "Above SMA20" });
  else if (features.priceVsSma20 < -0.02)
    signals.push({ dir: "DOWN", weight: 1.2, name: "Below SMA20" });

  if (features.sma20VsSma50 > 0.01) signals.push({ dir: "UP", weight: 1.5, name: "Golden cross" });
  else if (features.sma20VsSma50 < -0.01)
    signals.push({ dir: "DOWN", weight: 1.5, name: "Death cross" });

  signals.push(
    features.macdHist > 0
      ? { dir: "UP", weight: 1.3, name: "MACD bullish" }
      : { dir: "DOWN", weight: 1.3, name: "MACD bearish" }
  );

  if (features.bbPos < 0.1) signals.push({ dir: "UP", weight: 1.8, name: "BB lower bounce" });
  else if (features.bbPos > 0.9) signals.push({ dir: "DOWN", weight: 1.8, name: "BB upper rejection" });

  if (features.ret5d > 0.03) signals.push({ dir: "UP", weight: 0.9, name: "5d momentum up" });
  else if (features.ret5d < -0.03) signals.push({ dir: "DOWN", weight: 0.9, name: "5d momentum down" });

  if (features.volRatio > 1.5 && features.ret1d > 0)
    signals.push({ dir: "UP", weight: 1.0, name: "Volume surge up" });
  if (features.volRatio > 1.5 && features.ret1d < 0)
    signals.push({ dir: "DOWN", weight: 1.0, name: "Volume surge down" });

  const total = signals.reduce((a, s) => a + s.weight, 0);
  let up = 0,
    down = 0,
    hold = 0;
  for (const s of signals) {
    if (s.dir === "UP") up += s.weight;
    else if (s.dir === "DOWN") down += s.weight;
    else hold += s.weight;
  }
  up /= total;
  down /= total;
  hold /= total;

  let direction, confidence;
  if (up >= down && up >= hold) {
    direction = "UP";
    confidence = 0.5 + up * 0.5;
  } else if (down > up && down >= hold) {
    direction = "DOWN";
    confidence = 0.5 + down * 0.5;
  } else {
    direction = "HOLD";
    confidence = 0.5 + hold * 0.5;
  }

  return {
    direction,
    confidence: Math.min(0.95, confidence),
    signals,
    upScore: up,
    downScore: down,
    holdScore: hold,
  };
}

export function generatePrediction(symbol, rows) {
  const features = buildFeatures(rows);
  if (!features) return null;

  const { direction, confidence, signals, upScore, downScore, holdScore } =
    predictDirection(features);

  const last = rows[rows.length - 1];
  const targetDate = getNextTradingDay(last.date);
  const atr14val = atr(rows, 14) || last.close * 0.01;
  const multiplier = direction === "UP" ? 1 : direction === "DOWN" ? -1 : 0;
  const predictedPrice = last.close + multiplier * atr14val;

  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO predictions
        (symbol, target_date, direction, confidence, predicted_price, model_name, features)
      VALUES (?, ?, ?, ?, ?, 'ensemble', ?)
    `)
    .run([
      symbol.toUpperCase(),
      targetDate,
      direction,
      confidence,
      predictedPrice,
      JSON.stringify({ features, signals: signals.map((s) => s.name) }),
    ]);

  return {
    id: lastInsertRowid,
    symbol: symbol.toUpperCase(),
    targetDate,
    direction,
    confidence: Math.round(confidence * 100),
    currentPrice: last.close,
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    signals: signals.slice(0, 5),
    scores: {
      up: Math.round(upScore * 100),
      down: Math.round(downScore * 100),
      hold: Math.round(holdScore * 100),
    },
    features,
  };
}

export function getLatestPrediction(symbol) {
  return db
    .prepare(`SELECT * FROM predictions WHERE symbol = ? ORDER BY predicted_at DESC LIMIT 1`)
    .get([symbol.toUpperCase()]);
}

export function getPredictionHistory(symbol, limit = 30) {
  return db
    .prepare(`SELECT * FROM predictions WHERE symbol = ? ORDER BY predicted_at DESC LIMIT ?`)
    .all([symbol.toUpperCase(), limit]);
}

export function resolvePredictions() {
  const pending = db
    .prepare(
      `SELECT * FROM predictions WHERE was_correct IS NULL AND actual_price IS NULL`
    )
    .all([]);

  for (const pred of pending) {
    const actual = db
      .prepare(
        `SELECT close FROM price_history WHERE symbol = ? AND date >= ? ORDER BY date LIMIT 1`
      )
      .get([pred.symbol, pred.target_date]);

    if (actual) {
      const wasCorrect =
        (pred.direction === "UP" && actual.close > pred.predicted_price) ||
        (pred.direction === "DOWN" && actual.close < pred.predicted_price) ||
        (pred.direction === "HOLD" &&
          Math.abs(actual.close - pred.predicted_price) / pred.predicted_price < 0.01)
          ? 1
          : 0;
      db.prepare(`UPDATE predictions SET actual_price = ?, was_correct = ? WHERE id = ?`).run([
        actual.close,
        wasCorrect,
        pred.id,
      ]);
    }
  }

  return pending.length;
}

export function getAccuracyStats(symbol) {
  return db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(was_correct) as correct,
        ROUND(AVG(was_correct) * 100, 1) as accuracy_pct,
        COUNT(CASE WHEN direction='UP'   THEN 1 END) as up_count,
        COUNT(CASE WHEN direction='DOWN' THEN 1 END) as down_count,
        COUNT(CASE WHEN direction='HOLD' THEN 1 END) as hold_count
      FROM predictions
      WHERE symbol = ? AND was_correct IS NOT NULL
    `)
    .get([symbol.toUpperCase()]);
}

function getNextTradingDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
