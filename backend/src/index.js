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

// For Vercel (serverless), we export the app
export default app;

// For Render/Railway/Local (persistent), we start the server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Stock Predictor API → http://localhost:${PORT}`);
    startScheduler();
  });
} else {
  // Vercel serverless startup
  startScheduler();
}
