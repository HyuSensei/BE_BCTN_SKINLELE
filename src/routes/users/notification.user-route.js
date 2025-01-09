import express from "express";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../controllers/notification.controller.js";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";
const router = express.Router();

router.get("/by-user", authMiddlewareUser, getNotificationsByUser);
router.put("/mark-as-read/:id", authMiddlewareUser, markNotificationAsRead);
router.post(
  "/mark-all-as-read",
  authMiddlewareUser,
  markAllNotificationsAsRead
);
router.post("/remove-all", authMiddlewareUser, deleteAllNotifications);

router.delete("/:id", authMiddlewareUser, deleteNotification);

export default router;
