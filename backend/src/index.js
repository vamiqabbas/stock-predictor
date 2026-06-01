import express from "express";
import cors from "cors";
import stocksRouter from "./routes/stocks.js";
import watchlistRouter from "./routes/watchlist.js";
import { startScheduler } from "./services/scheduler.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/stocks",    stocksRouter);
app.use("/api/watchlist", watchlistRouter);

app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Stock Predictor API → http://localhost:${PORT}`);
  startScheduler();
});
