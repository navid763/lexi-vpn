import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { topupAmountHandler, topupReceiptHandler } from "../handlers/wallet-topup.handler.ts";
import { userSteps } from "../utils/state.ts";
import { receiptHandler } from "../handlers/receipt.handler.ts";

export async function messageRouter(
    ctx: BotContext,
    adapter: BotAdapter
) {
    const chatId = String(ctx.chatId);
    const step = userSteps.get(chatId);

    if (ctx.photo) {
        if (step === "AWAITING_TOPUP_RECEIPT") {
            return topupReceiptHandler(ctx, adapter);
        }

        return receiptHandler(ctx, adapter);
    }

    if (ctx.text) {
        if (step === "AWAITING_TOPUP_AMOUNT") {
            return topupAmountHandler(ctx, adapter);
        }
    }
}