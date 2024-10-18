import cron from "node-cron";
import { updateExpiredProduct } from "../services/product.service.js";
import { hideExpiredPromotions } from "../services/promotion.service.js";

cron.schedule("0 0 * * *", updateExpiredProduct, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("0 0 * * *", hideExpiredPromotions, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});


