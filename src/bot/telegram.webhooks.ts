import type { Request, Response } from "express";
import { TelegramAdapter } from "./adapters/telegram.adapter.ts";
import { callbackRouter } from "./routers/callback.router.ts";
import { commandRouter } from "./routers/command.router.ts";
import { messageRouter } from "./routers/message.router.ts";
import { parseTelegramUpdate } from "./utils/parseTelegramUpdates.ts";

const adapter = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN!);

export const telegramWebhook = async (req: Request, res: Response) => {

    // --- Security: verify the request actually came from Telegram ---
    // You set this secret when calling setWebhook (see startBot.ts)
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        // Return 401 but don't reveal why — no need to help attackers
        return res.sendStatus(401);
    }

    // Telegram expects a fast 200 response; do the actual work after replying
    res.sendStatus(200);

    try {
        const update = req.body;
        const ctx = parseTelegramUpdate(update);

        if (!ctx) return;

        if (ctx.text?.startsWith("/")) {
            return commandRouter(ctx, adapter);
        }

        if (ctx.callbackData) {
            return callbackRouter(ctx, adapter);
        }

        return messageRouter(ctx, adapter);

    } catch (err) {
        // Log but don't crash — Telegram will retry failed updates
        console.error("Error processing Telegram update:", err);
    }
}