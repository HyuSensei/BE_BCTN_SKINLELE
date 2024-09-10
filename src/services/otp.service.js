import Otp from "../models/otp.modal";

export const cleanOtp = async () => {
  try {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    await Otp.deleteMany({ exp: { $lt: currentTimestamp } });
  } catch (error) {
    console.error("Error:", error);
  }
};
