import cron from "node-cron";
import { cleanOtp } from "../services/otp.service";

cron.schedule("0 0 * * *", cleanOtp, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});
