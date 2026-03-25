import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { plansHandler } from "../handlers/plans.handler.ts";
import { startHandler } from "../handlers/start.handler.ts";
import { selectProductHandler } from "../handlers/select-product.handler.ts";
import { approveOrderHandler } from "../handlers/approve.handler.ts";
import { subscriptionsHandler } from "../handlers/subscriptions.handler.ts";

export async function callbackRouter(ctx: BotContext, adapter: BotAdapter) {

    if (!ctx.callbackData) return;

    const { action } = parseCallbackData(ctx.callbackData);

    switch (action) {
        case "PLANS":
            return plansHandler(ctx, adapter);

        case "BUY":
            return selectProductHandler(ctx, adapter);

        case "HOME":
            return startHandler(ctx, adapter);

        case "APPROVE":
        case "REJECT":
            return approveOrderHandler(ctx, adapter);

        case "MY_SERVICES":
            return subscriptionsHandler(ctx, adapter);

        default:
            await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
    }
}