import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { adminGuard } from "../middlewares/admin.guard.ts";

const adminRouther = Router();

adminRouther.post("/orders/:id/approve",
    authMiddleware,
    adminGuard,
    AdminController.approveOrder
);

export default adminRouther;