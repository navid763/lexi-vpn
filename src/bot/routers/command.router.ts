import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";

import { startHandler } from "../handlers/start.handler.ts";
import { checkWalletBalanceHandler } from "../handlers/check-wallet.handler.ts";
import { subscriptionsHandler } from "../handlers/subscriptions.handler.ts";
import { plansHandler } from "../handlers/plans.handler.ts";



export async function commandRouter(
    ctx: BotContext,
    adapter: BotAdapter
) {

    if (!ctx.text) return;

    const command = ctx.text.split(" ")[0];

    switch (command) {

        case "/start":
            return startHandler(ctx, adapter);
        case "/plans":
            return plansHandler(ctx, adapter);
        case "/my_services":
            return subscriptionsHandler(ctx, adapter);

        case "/my_balance":
            return checkWalletBalanceHandler(ctx, adapter);

        default:
            return adapter.sendMessage(
                ctx.chatId,
                "دستور نامعتبر."
            );
    }
}