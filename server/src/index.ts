import "dotenv/config";
import { validateEnv } from "./utils/validateEnv.js";

validateEnv();

import app from "./app.js";
import { startNotificationScheduler, stopNotificationScheduler } from "./services/notificationService.js";

const PORT = process.env.PORT || 3000;

// Crash on the next unhandled error instead of continuing in a corrupted
// state — a process manager (pm2, systemd, the platform's restart policy)
// should bring it back up.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`Server on PORT ${PORT}`);
  startNotificationScheduler();
});

const shutdown = () => {
  stopNotificationScheduler();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
