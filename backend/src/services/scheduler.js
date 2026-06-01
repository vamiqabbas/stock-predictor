import cron from "node-cron";
import db from "../db/database.js";
import { fetchAndStoreHistory, getPriceHistory } from "./marketData.js";
import { computeAndStoreIndicators } from "./indicators.js";
import { generatePrediction, resolvePredictions } from "../ml/predictor.js";

export function startScheduler() {
  // Refresh data + generate predictions every day at 6:30 PM (after US market close)
  cron.schedule("30 18 * * 1-5", async () => {
    console.log("[Scheduler] Daily data refresh started");
    await runDailyRefresh();
  });

  // Resolve pending predictions every day at 9:45 AM (after market open)
  cron.schedule("45 9 * * 1-5", () => {
    const resolved = resolvePredictions();
    console.log(`[Scheduler] Resolved ${resolved} predictions`);
  });

  console.log("[Scheduler] Started — daily refresh at 18:30, resolve at 09:45 (Mon–Fri)");
}

export async function runDailyRefresh() {
  const symbols = db
    .prepare("SELECT symbol FROM watchlist")
    .all([])
    .map((r) => r.symbol);

  for (const symbol of symbols) {
    try {
      const count = await fetchAndStoreHistory(symbol, "1y");
      const rows = getPriceHistory(symbol, 365);
      computeAndStoreIndicators(symbol, rows);
      generatePrediction(symbol, rows);
      console.log(`[Scheduler] ${symbol}: ${count} rows, prediction generated`);
    } catch (err) {
      console.error(`[Scheduler] ${symbol} failed:`, err.message);
    }
  }
}
