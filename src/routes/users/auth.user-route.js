import express from "express";
import {
  loginUserValidate,
  registerUserValidate,
  resetPasswordValidate,
  updateAccountValidate,
} from "../../validates/auth.validate.js";
import {
  getAccountUser,
  login,
  register,
  resetPassword,
  sendOtp,
  updateAccount,
  verifyOtp,
} from "../../controllers/auth.controller.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", loginUserValidate, validateMiddleWare, login);
router.post("/register", registerUserValidate, validateMiddleWare, register);
router.post("/verify-otp", verifyOtp);
router.post("/send-otp", sendOtp);
router.post(
  "/reset-password",
  resetPasswordValidate,
  validateMiddleWare,
  resetPassword
);
router.put(
  "/account",
  authMiddlewareUser,
  updateAccountValidate,
  validateMiddleWare,
  updateAccount
);
router.get("/account", authMiddlewareUser, getAccountUser);

export default router;
