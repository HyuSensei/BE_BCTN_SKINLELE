import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";

const verifyToken = (token, secret) => jwt.verify(token, secret);

const findById = async (model, id) => model.findById(id).select("-password");

const handleAuthError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const commonAuthLogic = async (
  req,
  res,
  next,
  headerName,
  model,
  secretKey,
  roleCheck = null
) => {
  try {
    const token = req.header(headerName)?.split(" ")[1];
    if (!token) {
      return handleAuthError(res, 401, "Quyền truy cập bị từ chối");
    }

    const decoded = verifyToken(token, secretKey);

    const entity = await findById(model, decoded.id);
    if (!entity || (roleCheck && !roleCheck(entity))) {
      return handleAuthError(res, 403, "Không có quyền truy cập");
    }

    if (model === Admin && !entity.isActive) {
      return handleAuthError(res, 403, "Tài khoản đã bị vô hiệu hóa");
    }

    req.user = entity;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return handleAuthError(res, 401, "Token không hợp lệ");
    }
    if (error.name === "TokenExpiredError") {
      return handleAuthError(res, 401, "Token đã hết hạn");
    }
    console.error("Lỗi xác thực:", error);
    handleAuthError(res, 500, `Có lỗi xảy ra khi xác thực`);
  }
};

export const authMiddlewareUser = (req, res, next) =>
  commonAuthLogic(
    req,
    res,
    next,
    "X-Customer-Header",
    User,
    process.env.JWT_SECRET_KEY_USER
  );

export const authMiddlewareAdmin = (req, res, next) =>
  commonAuthLogic(
    req,
    res,
    next,
    "X-Admin-Header",
    Admin,
    process.env.JWT_SECRET_KEY_ADMIN,
    (admin) => admin.role === "ADMIN" || admin.role === "SUPPORT"
  );
