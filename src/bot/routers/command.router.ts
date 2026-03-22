import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";

import { startHandler } from "../handlers/start.handler.ts";

export async function commandRouter(
    ctx: BotContext,
    adapter: BotAdapter
) {

    if (!ctx.text) return;

    const command = ctx.text.split(" ")[0];

    switch (command) {

        case "/start":
            return startHandler(ctx, adapter);

        default:
            return adapter.sendMessage(
                ctx.chatId,
                "دستور نامعتبر."
            );
    }
}