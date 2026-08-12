import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
