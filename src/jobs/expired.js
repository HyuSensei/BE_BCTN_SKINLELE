import cron from "node-cron";
import { updateExpiredProduct } from "../services/product.service.js";

cron.schedule("0 0 * * *", updateExpiredProduct, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});


