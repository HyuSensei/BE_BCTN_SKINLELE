import cron from "node-cron";
import { runDoctorProductMatching } from "../services/doctor-match.service.js";

cron.schedule(
  "45 8 * * *",
  async () => {
    console.log("Bắt đầu tính toán matching bác sĩ - danh mục...");
    try {
      await runDoctorProductMatching();
      console.log("Hoàn thành matching");
    } catch (error) {
      console.error("Lỗi matching:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh",
  }
);
