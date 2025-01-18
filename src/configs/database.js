import mongoose from "mongoose";
import { initializeAdmin } from "../models/admin.model.js";
import { initializeProductCosts } from "../models/product.model.js";

const connectDabase = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URL,
      {
        dbName: process.env.DB_NAME,
      },
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    );
    initializeProductCosts();
    initializeAdmin();
    console.log("🌐------------------Database connected---------------🌐");
  } catch (error) {
    console.log(error);
  }
};

export default connectDabase;
