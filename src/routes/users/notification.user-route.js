import express from "express";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotificationsByDoctor,
  getNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../controllers/notification.controller.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";
const router = express.Router();

router.get("/by-user", authMiddlewareUser, getNotificationsByUser);
router.get("/by-doctor", authMiddlewareDoctor, getNotificationsByDoctor);
router.post(
  "/mark-all-as-read",
  authMiddlewareUser,
  markAllNotificationsAsRead
);
router.post(
  "/mark-all-as-read-doctor",
  authMiddlewareDoctor,
  markAllNotificationsAsRead
);
router.post("/remove-all", authMiddlewareUser, deleteAllNotifications);
router.put("/mark-as-read/:id", authMiddlewareUser, markNotificationAsRead);
router.put(
  "/mark-as-read-doctor/:id",
  authMiddlewareDoctor,
  markNotificationAsRead
);

router.delete("/:id", authMiddlewareUser, deleteNotification);

export default router;
