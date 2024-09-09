import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDabase from "./configs/database.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

const app = express();

app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.listen(PORT, async () => {
  await connectDabase();
  console.log(`-------------SERVER RUN PORT ${PORT}-------------`);
});
