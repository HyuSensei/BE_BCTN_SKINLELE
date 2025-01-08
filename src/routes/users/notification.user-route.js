import express from "express";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotificationsByDoctor,
  getNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../controllers/notification.controller.js";
const router = express.Router();

router.get("/by-user", getNotificationsByUser);
router.get("/by-doctor", getNotificationsByDoctor);
router.put("/mark-as-read/:id", markNotificationAsRead);
router.post("/mark-all-as-read", markAllNotificationsAsRead);
router.post("/remove-all", deleteAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
