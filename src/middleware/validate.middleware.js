import { validationResult } from "express-validator";

export const validateMiddleWare = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.errors[0].msg });
  }
  next();
};
