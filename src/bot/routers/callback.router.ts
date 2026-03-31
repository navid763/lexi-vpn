import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { plansHandler } from "../handlers/plans.handler.ts";
import { startHandler } from "../handlers/start.handler.ts";
import { cardPayHandler } from "../handlers/card-pay.handler.ts";
import { approveOrderHandler } from "../handlers/approve.handler.ts";
import { subscriptionsHandler } from "../handlers/subscriptions.handler.ts";
import { checkWalletBalanceHandler } from "../handlers/check-wallet.handler.ts";
import { paymentOptionsHandler } from "../handlers/payment-options.handler.ts";
import { walletPayHandler } from "../handlers/wallet-pay.handler.ts";
import { increaseBalanceHandler } from "../handlers/increase-balance.handler.ts";
import { approveTopupHandler } from "../handlers/approve-walet-topup.handler.ts";
import { getMyRefCodeHandler } from "../handlers/get-referral-code.handler.ts";

export async function callbackRouter(ctx: BotContext, adapter: BotAdapter) {

    if (!ctx.callbackData) return;

    const { action } = parseCallbackData(ctx.callbackData);

    switch (action) {
        case "HOME":
            return startHandler(ctx, adapter);

        case "PLANS":
            return plansHandler(ctx, adapter);

        case "BUY":
            return paymentOptionsHandler(ctx, adapter);

        case "CARD_PAY":
            return cardPayHandler(ctx, adapter);

        case "WALLET_PAY":
            return walletPayHandler(ctx, adapter);

        case "INNCREASE_BALANCE":
            return increaseBalanceHandler(ctx, adapter)

        case "APPROVE":
        case "REJECT":
            return approveOrderHandler(ctx, adapter);

        case "APPROVE_TOPUP":
        case "REJECT_TOPUP":
            return approveTopupHandler(ctx, adapter);

        case "MY_SERVICES":
            return subscriptionsHandler(ctx, adapter);

        case "MY_BALANCE":
            return checkWalletBalanceHandler(ctx, adapter);

        case "GET_MY_REFERRAL":
            return getMyRefCodeHandler(ctx, adapter);

        default:
            await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
    }
}