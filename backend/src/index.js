import express from "express";
import cors from "cors";
import stocksRouter from "./routes/stocks.js";
import watchlistRouter from "./routes/watchlist.js";
import { startScheduler } from "./services/scheduler.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
}));
app.use(express.json());

app.use("/api/stocks", stocksRouter);
app.use("/api/watchlist", watchlistRouter);

app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

export default app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Stock Predictor API → http://localhost:${PORT}`);
    startScheduler();
  });
} else {
  // In Vercel (production), we still need to start the scheduler once
  // Note: Vercel functions are short-lived, so this might not work as intended
  // for a persistent daily scheduler. For a better solution, use Vercel Crons.
  startScheduler();
}
