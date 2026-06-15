// src/bot/routers/command.router.ts
import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";

import { startHandler } from "../handlers/start.handler.js";
import { checkWalletBalanceHandler } from "../handlers/check-wallet.handler.js";
import { subscriptionsHandler } from "../handlers/subscriptions.handler.js";
import { plansHandler } from "../handlers/plans.handler.js";
import { profileHandler } from "../handlers/profile.handler.js";
import { adminMenuHandler } from "../handlers/admin/admin-menu.handler.js";

export async function commandRouter(ctx: BotContext, adapter: BotAdapter) {
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

        case "/my_profile":
            return profileHandler(ctx, adapter);

        case "/admin":
            return adminMenuHandler(ctx, adapter);

        default:
            return adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
    }
}
