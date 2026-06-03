import helmet from "helmet";
import cors from "cors";
import express from "express";
import limiter from "./middleware/rateLimiter.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(limiter);

app.use("/auth", authRouter);

export default app;
