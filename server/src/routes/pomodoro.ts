import { Router } from "express";
import {
  start,
  complete,
  interrupt,
  history,
  active,
} from "../controllers/pomodoroController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/start", start);
router.patch("/:id/complete", complete);
router.patch("/:id/interrupt", interrupt);
router.get("/history", history);
router.get("/active", active);

export default router;
