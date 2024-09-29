import mongoose from "mongoose";
import { initializeAdmin } from "../models/admin.model.js";

const connectDabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME,
    });
    initializeAdmin();
    console.log("------------------Database connected---------------");
  } catch (error) {
    console.log(error);
  }
};

export default connectDabase;
