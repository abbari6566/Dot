import helmet from "helmet";
import cors from "cors";
import express from "express";
import limiter from "./middleware/rateLimiter.js";
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(limiter);
export default app;
