import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { topupAmountHandler, topupReceiptHandler } from "../handlers/wallet-topup.handler.js";
import { userSteps } from "../utils/state.js";
import { receiptHandler } from "../handlers/receipt.handler.js";
import {
    adminUserSearchResultsHandler,
} from "../handlers/admin/admin-search-user.handler.js";
import {
    adminOrderSearchResultHandler,
} from "../handlers/admin/admin-order-detail.handler.js";
import {
    adminBroadcastSendHandler,
} from "../handlers/admin/admin-broadcast.handler.js";
import {
    adminManualTopupConfirmHandler,
} from "../handlers/admin/admin-user-detail.handler.js";

export async function messageRouter(ctx: BotContext, adapter: BotAdapter) {
    const chatId = String(ctx.chatId);
    const step = userSteps.get(chatId);

    // ── Photo messages ────────────────────────────────────────────────────────
    if (ctx.photo) {
        if (step === "AWAITING_TOPUP_RECEIPT") {
            return topupReceiptHandler(ctx, adapter);
        }
        return receiptHandler(ctx, adapter);
    }

    // ── Text messages ─────────────────────────────────────────────────────────
    if (ctx.text) {
        // User flows
        if (step === "AWAITING_TOPUP_AMOUNT") {
            return topupAmountHandler(ctx, adapter);
        }

        // Admin flows
        if (step === "ADMIN_AWAITING_USER_SEARCH") {
            return adminUserSearchResultsHandler(ctx, adapter);
        }

        if (step === "ADMIN_AWAITING_ORDER_SEARCH") {
            return adminOrderSearchResultHandler(ctx, adapter);
        }

        if (step === "ADMIN_AWAITING_BROADCAST") {
            return adminBroadcastSendHandler(ctx, adapter);
        }

        // ADMIN_AWAITING_TOPUP_AMOUNT:{userId} — value contains the target user id
        if (step?.startsWith("ADMIN_AWAITING_TOPUP_AMOUNT:")) {
            const targetUserId = parseInt(step.split(":")[1]);
            if (!isNaN(targetUserId)) {
                return adminManualTopupConfirmHandler(ctx, adapter, targetUserId);
            }
        }
    }
}
