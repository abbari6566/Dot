import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import * as controller from "../controllers/flashcardController.js";

const router = Router();
router.use(authenticate);

router.get("/topics", controller.topics);
router.post("/topics", controller.createTopic);
router.patch("/topics/:id", controller.updateTopic);
router.delete("/topics/:id", controller.deleteTopic);
router.post("/topics/:topicId/groups", controller.createGroup);
router.patch("/groups/:id", controller.updateGroup);
router.delete("/groups/:id", controller.deleteGroup);
router.post("/groups/:groupId/cards", controller.createCard);
router.patch("/cards/:id", controller.updateCard);
router.delete("/cards/:id", controller.deleteCard);
router.put("/groups/:groupId/reminder", controller.setReminder);
router.delete("/groups/:groupId/reminder", controller.deleteReminder);
router.get("/notifications/public-key", controller.publicKey);
router.post("/notifications/subscriptions", controller.subscribe);
router.delete("/notifications/subscriptions", controller.unsubscribe);

export default router;
