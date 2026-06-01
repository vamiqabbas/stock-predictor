import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data/stocks.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const SQL = await initSqlJs();

// Load existing DB file or create new
let db;
if (fs.existsSync(DB_PATH)) {
  const fileBuffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
}

// Track whether we are inside a transaction so we can skip mid-transaction persists
let inTransaction = false;

// Write db to disk
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Prepared statement helper — emulates better-sqlite3 API
function prepare(sql) {
  return {
    run(params = []) {
      const p = Array.isArray(params) ? params : Object.values(params);
      db.run(sql, p);
      // Capture last inserted rowid
      let lastInsertRowid = 0;
      try {
        const res = db.exec("SELECT last_insert_rowid() as id");
        if (res.length > 0 && res[0].values.length > 0) {
          lastInsertRowid = res[0].values[0][0];
        }
      } catch (_) {
        // ignore
      }
      // Only persist if we're not inside a transaction (transaction persists on commit)
      if (!inTransaction) {
        persist();
      }
      return { lastInsertRowid };
    },
    get(params = []) {
      const p = Array.isArray(params) ? params : Object.values(params);
      const stmt = db.prepare(sql);
      stmt.bind(p);
      let row;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    },
    all(params = []) {
      const p = Array.isArray(params) ? params : Object.values(params);
      const stmt = db.prepare(sql);
      stmt.bind(p);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

// Transaction helper — wraps fn in BEGIN/COMMIT, persist only once at the end
function transaction(fn) {
  return (...args) => {
    inTransaction = true;
    db.run("BEGIN");
    try {
      fn(...args);
      db.run("COMMIT");
      inTransaction = false;
      persist();
    } catch (e) {
      inTransaction = false;
      db.run("ROLLBACK");
      throw e;
    }
  };
}

// Direct exec helper
function exec(sql) {
  db.run(sql);
}

// Schema — run each statement separately to avoid multi-statement issues
db.run(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT,
    added_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL,
    volume INTEGER, adj_close REAL,
    UNIQUE(symbol, date)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    predicted_at TEXT DEFAULT (datetime('now')),
    target_date TEXT NOT NULL,
    direction TEXT NOT NULL,
    confidence REAL NOT NULL,
    predicted_price REAL,
    actual_price REAL,
    was_correct INTEGER,
    model_name TEXT DEFAULT 'ensemble',
    features TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    sma20 REAL, sma50 REAL, sma200 REAL, ema20 REAL,
    rsi14 REAL, macd REAL, macd_signal REAL, macd_hist REAL,
    bb_upper REAL, bb_mid REAL, bb_lower REAL, atr14 REAL, obv REAL,
    UNIQUE(symbol, date)
  )
`);

persist();

export default { prepare, transaction, exec };
