import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import * as controller from "../controllers/noteController.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.list);
router.post("/folders", controller.createFolder);
router.patch("/folders/:id", controller.updateFolder);
router.delete("/folders/:id", controller.deleteFolder);
router.post("/", controller.createNote);
router.get("/:id", controller.getNote);
router.patch("/:id", controller.updateNote);
router.delete("/:id", controller.deleteNote);
router.post("/:id/tasks", controller.createTask);
router.patch("/tasks/:id", controller.toggleTask);
router.delete("/tasks/:id", controller.deleteTask);

export default router;
