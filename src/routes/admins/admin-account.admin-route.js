import express from "express";
import {
  createAccountAdmin,
  getAllAccountAdmin,
  removeAccountAdmin,
  updateAccountAdmin,
} from "../../controllers/admin.controller.js";

const router = express.Router();

router.post("/", createAccountAdmin);
router.put("/:id", updateAccountAdmin);
router.delete("/:id", removeAccountAdmin);
router.get("/", getAllAccountAdmin);

export default router;
