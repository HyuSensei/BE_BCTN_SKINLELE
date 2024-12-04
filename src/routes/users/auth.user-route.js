import express from "express";
import {
  loginUserValidate,
  registerUserValidate,
  resetPasswordValidate,
  updateAccountValidate,
} from "../../validates/auth.validate.js";
import {
  getAccountDoctor,
  getAccountUser,
  login,
  loginDoctor,
  register,
  resetPassword,
  sendOtp,
  updateAccount,
  verifyOtp,
} from "../../controllers/auth.controller.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";

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

router.post(
  "/login-doctor",
  loginUserValidate,
  validateMiddleWare,
  loginDoctor
);
router.get("/account-doctor", authMiddlewareDoctor, getAccountDoctor);

export default router;
