import mongoose from "mongoose";

const connectDabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME,
    });
    console.log("------------------Database connected---------------");
  } catch (error) {
    console.log(error);
  }
};

export default connectDabase;
