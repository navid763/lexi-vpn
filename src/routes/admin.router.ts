import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminGuard } from "../middlewares/admin.guard.js";

const adminRouther = Router();

adminRouther.post("/orders/:id/approve",
    authMiddleware,
    adminGuard,
    AdminController.approveOrder
);

export default adminRouther;
