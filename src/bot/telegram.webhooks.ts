import type { Request, Response } from "express";
import { TelegramAdapter } from "./adapters/telegram.adapter.js";
import { callbackRouter } from "./routers/callback.router.js";
import { commandRouter } from "./routers/command.router.js";
import { messageRouter } from "./routers/message.router.js";
import { parseTelegramUpdate } from "./utils/parseTelegramUpdates.js";
import { checkRateLimit } from "./middlewares/rate-limit.middleware.js";

const adapter = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN!);

export const telegramWebhook = async (req: Request, res: Response) => {

    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return res.sendStatus(401);
    }

    // Telegram expects a fast 200 — always reply immediately
    res.sendStatus(200);

    try {
        const update = req.body;
        const ctx = parseTelegramUpdate(update);

        if (!ctx) return;

        // ── Per-user rate limit ───────────────────────────────────────────────
        // Admins bypass the limit so their panel actions are never blocked.
        const isAdmin = String(ctx.chatId) === String(process.env.ADMIN_CHAT_ID);

        if (!isAdmin && !checkRateLimit(ctx.chatId)) {
            // Silent drop — no reply, no error. Telegram will not retry 200 responses
            // so we simply ignore the excess update. Optionally send a one-time warning:
            // await adapter.sendMessage(ctx.chatId, "⏳ لطفاً کمی آهسته‌تر...");
            console.warn(`[RateLimit] chatId ${ctx.chatId} throttled`);
            return;
        }

        if (ctx.text?.startsWith("/")) {
            return commandRouter(ctx, adapter);
        }

        if (ctx.callbackData) {
            return callbackRouter(ctx, adapter);
        }

        return messageRouter(ctx, adapter);

    } catch (err) {
        console.error("Error processing Telegram update:", err);
    }
};
