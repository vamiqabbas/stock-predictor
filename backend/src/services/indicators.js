import db from "../db/database.js";

export function sma(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k);
  return val;
}

export function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function macd(closes) {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  if (fast == null || slow == null) return { macd: null, signal: null, hist: null };
  const macdVal = fast - slow;
  const signal = macdVal * (2 / 10) + macdVal * (8 / 10);
  return { macd: macdVal, signal, hist: macdVal - signal };
}

export function bollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) return { upper: null, mid: null, lower: null };
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mid + stdDev * std, mid, lower: mid - stdDev * std };
}

export function atr(rows, period = 14) {
  if (rows.length < period + 1) return null;
  const trs = rows.slice(1).map((row, i) =>
    Math.max(
      row.high - row.low,
      Math.abs(row.high - rows[i].close),
      Math.abs(row.low - rows[i].close)
    )
  );
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function obv(rows) {
  let val = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].close > rows[i - 1].close) val += rows[i].volume;
    else if (rows[i].close < rows[i - 1].close) val -= rows[i].volume;
  }
  return val;
}

export function computeAndStoreIndicators(symbol, rows) {
  if (!rows || rows.length < 30) return 0;

  const closes = rows.map((r) => r.close).filter(Boolean);
  const lastDate = rows[rows.length - 1].date;
  const bb = bollingerBands(closes);
  const mc = macd(closes);

  db.prepare(`
    INSERT OR REPLACE INTO indicators
      (symbol, date, sma20, sma50, sma200, ema20, rsi14,
       macd, macd_signal, macd_hist,
       bb_upper, bb_mid, bb_lower, atr14, obv)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([
    symbol.toUpperCase(),
    lastDate,
    sma(closes, 20),
    sma(closes, 50),
    sma(closes, 200),
    ema(closes, 20),
    rsi(closes, 14),
    mc.macd,
    mc.signal,
    mc.hist,
    bb.upper,
    bb.mid,
    bb.lower,
    atr(rows, 14),
    obv(rows),
  ]);

  return 1;
}

export function getLatestIndicators(symbol) {
  return db
    .prepare(`SELECT * FROM indicators WHERE symbol = ? ORDER BY date DESC LIMIT 1`)
    .get([symbol.toUpperCase()]);
}

export function getIndicatorHistory(symbol, days = 90) {
  return db
    .prepare(`SELECT * FROM indicators WHERE symbol = ? ORDER BY date DESC LIMIT ?`)
    .all([symbol.toUpperCase(), days])
    .reverse();
}
