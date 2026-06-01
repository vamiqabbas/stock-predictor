import { getHistorical, getQuote, searchSymbols as yahooSearch } from "./yahooFinance.js";
import db from "../db/database.js";

export async function fetchAndStoreHistory(symbol, range = "1y") {
  const rows = await getHistorical(symbol, range);

  const insertMany = db.transaction((data) => {
    for (const row of data) {
      db.prepare(
        `INSERT OR REPLACE INTO price_history (symbol, date, open, high, low, close, volume, adj_close)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run([
        symbol.toUpperCase(),
        row.date,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume,
        row.adjClose,
      ]);
    }
  });

  insertMany(rows);
  return rows.length;
}

export { getQuote };
export { yahooSearch as searchSymbols };

export function getPriceHistory(symbol, days = 365) {
  return db
    .prepare(`SELECT * FROM price_history WHERE symbol = ? ORDER BY date DESC LIMIT ?`)
    .all([symbol.toUpperCase(), days])
    .reverse();
}
