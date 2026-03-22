import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";

import { receiptHandler } from "../handlers/receipt.handler.ts";

export async function messageRouter(
    ctx: BotContext,
    adapter: BotAdapter
) {
    if (ctx.photo) {
        return receiptHandler(ctx, adapter);
    }
}