import type { Request, Response, NextFunction } from "express";
import { User } from "../models/index.ts";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const chatId = req.headers["x-telegram-id"];

        if (!chatId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findOne({
            where: { chat_id: chatId }
        });

        if (!user) {
            return res.status(404).json({ error: "user not found" });
        }

        (req as any).user = user.dataValues;

        next();

    } catch (err) {
        res.status(500).json({ error_title: "Auth error", error_msg: err });
    }
}