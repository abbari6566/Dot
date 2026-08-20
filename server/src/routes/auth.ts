import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateGoal,
  updateProfileHandler,
  changePasswordHandler,
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.patch("/daily-goal", authenticate, updateGoal);
router.patch("/profile", authenticate, updateProfileHandler);
router.patch("/password", authenticate, changePasswordHandler);

export default router;
