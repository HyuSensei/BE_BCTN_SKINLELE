import cron from "node-cron";
import { updateExpiredProduct } from "../services/product.service";

cron.schedule("0 0 * * *", updateExpiredProduct, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});
