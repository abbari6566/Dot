import helmet from "helmet";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import limiter from "./middleware/rateLimiter.js";
import cookieParser from "cookie-parser";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import pomodoroRouter from "./routes/pomodoro.js";
import flashcardRouter from "./routes/flashcards.js";

const app = express();

// Required for correct client IPs (rate limiting) and secure cookies when
// running behind a reverse proxy / load balancer (Render, Railway, Fly, etc.).
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "50kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(limiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/pomodoro", pomodoroRouter);
app.use("/flashcards", flashcardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
