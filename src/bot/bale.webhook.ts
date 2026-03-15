import type { Request, Response } from "express";
import { BaleAdapter } from "./adapters/bale.adapter.ts";
import { callbackRouter } from "./routers/callback.router.ts";
import { startHandler } from "./handlers/start.handler.ts";
import type { BotContext } from "./types/bot.context.ts";

const adapter = new BaleAdapter(process.env.BALE_BOT_TOKEN!);


export const baleWebhook = async (req: Request, res: Response) => {

    const update = req.body;

    if (update.message) { // plain text message 
        const ctx: BotContext = {
            chatId: update.message.chat.id,
            text: update.message.text,
            messenger: "bale",
            raw: update
        };

        if (ctx.text === "/start") {
            await startHandler(ctx, adapter);
        }
    }


    if (update.callback_query) { // callback query
        const ctx: BotContext = {
            chatId: update.callback_query.message.chat.id,
            callbackData: update.callback_query.data,
            messenger: "bale",
            raw: update
        };

        await callbackRouter(ctx, adapter);

    }
    res.sendStatus(200);
}
