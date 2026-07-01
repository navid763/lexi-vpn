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
    adminDmSendHandler
} from "../handlers/admin/admin-user-detail.handler.js";

import { adminEditCardConfirmHandler } from "../handlers/admin/admin-card.handler.js";

import {
    adminProductCreateConfirmHandler,
    adminProductEditPriceConfirmHandler,
} from "../handlers/admin/admin-product.handler.js";

import {
    adminSubExtendConfirmHandler,
    adminBulkExtendTargetsReceivedHandler,
    adminBulkExtendApplyHandler
} from "../handlers/admin/admin-sub-extend.handler.js";

import { adminAdLinkCreateConfirmHandler } from "../handlers/admin/admin-ad-links.handler.js";
import { adminEditReferralRewardConfirmHandler } from "../handlers/admin/admin-referral-reward.handler.js";

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

        if (step === "ADMIN_AWAITING_CARD_INFO") {
            return adminEditCardConfirmHandler(ctx, adapter);
        }

        if (step === "ADMIN_AWAITING_AD_LINK_LABEL") {
            return adminAdLinkCreateConfirmHandler(ctx, adapter);
        }

        // ADMIN_AWAITING_TOPUP_AMOUNT:{userId} — value contains the target user id
        if (step?.startsWith("ADMIN_AWAITING_TOPUP_AMOUNT:")) {
            const targetUserId = parseInt(step.split(":")[1]);
            if (!isNaN(targetUserId)) {
                return adminManualTopupConfirmHandler(ctx, adapter, targetUserId);
            }
        }

        if (step === "ADMIN_AWAITING_PRODUCT_DATA") {
            return adminProductCreateConfirmHandler(ctx, adapter);
        }

        // ADMIN_AWAITING_PRODUCT_PRICE:{productId} — value contains the target product id
        if (step?.startsWith("ADMIN_AWAITING_PRODUCT_PRICE:")) {
            const targetProductId = parseInt(step.split(":")[1]);
            if (!isNaN(targetProductId)) {
                return adminProductEditPriceConfirmHandler(ctx, adapter, targetProductId);
            }
        }

        if (step?.startsWith("ADMIN_AWAITING_DM:")) {
            const targetUserId = parseInt(step.split(":")[1]);
            if (!isNaN(targetUserId)) return adminDmSendHandler(ctx, adapter, targetUserId);
        }

        if (step?.startsWith("ADMIN_AWAITING_SUB_EXTEND:")) {
            const subId = parseInt(step.split(":")[1]);
            if (!isNaN(subId)) return adminSubExtendConfirmHandler(ctx, adapter, subId);
        }
        if (step === "ADMIN_AWAITING_BULK_TARGETS") {
            return adminBulkExtendTargetsReceivedHandler(ctx, adapter);
        }
        if (step === "ADMIN_AWAITING_BULK_AMOUNT") {
            return adminBulkExtendApplyHandler(ctx, adapter);
        }

        if (step === "ADMIN_AWAITING_REFERRAL_REWARD") {
            return adminEditReferralRewardConfirmHandler(ctx, adapter);
        }

    }
}
