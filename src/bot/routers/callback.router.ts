import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { parseCallbackData } from "../utils/callback-data.ts";

// Existing handlers
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
import { cancellWalletTopUpAmountHandler } from "../handlers/cancel-handlers/cancel-wallet-topup-amount.handler.ts";
import { cancelCardPayHandler } from "../handlers/cancel-handlers/cancel-card-pay.handler.ts";
import { profileHandler } from "../handlers/profile.handler.ts";

// Admin handlers
import { adminMenuHandler } from "../handlers/admin/admin-menu.handler.ts";
import { adminStatsHandler } from "../handlers/admin/admin-stats.handler.ts";
import { adminSearchUserHandler } from "../handlers/admin/admin-search-user.handler.ts";
import {
    adminUserDetailHandler,
    adminManualTopupAskHandler,
} from "../handlers/admin/admin-user-detail.handler.ts";
import {
    adminSearchOrderHandler,
    adminOrderDetailHandler,
    adminForceApproveHandler,
    adminForceRejectHandler,
} from "../handlers/admin/admin-order-detail.handler.ts";
import { adminBroadcastAskHandler } from "../handlers/admin/admin-broadcast.handler.ts";

import { renewalOptionsHandler } from "../handlers/renewal.handler.ts";
import { renewalWalletHandler, renewalCardHandler } from "../handlers/renewal-pay.handler.ts";

export async function callbackRouter(ctx: BotContext, adapter: BotAdapter) {
    if (!ctx.callbackData) return;

    const { action } = parseCallbackData(ctx.callbackData);

    switch (action) {
        // ── User flows ────────────────────────────────────────────────────────
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
            return increaseBalanceHandler(ctx, adapter);

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

        case "MY_PROFILE":
            return profileHandler(ctx, adapter);

        case "GET_MY_REFERRAL":
            return getMyRefCodeHandler(ctx, adapter);

        case "CANCEL_TOPUP_AMOUNT":
            return cancellWalletTopUpAmountHandler(ctx, adapter);

        case "CANCEL_CARD_PAY":
            return cancelCardPayHandler(ctx, adapter);

        case "RENEW":
            return renewalOptionsHandler(ctx, adapter);

        case "RENEWAL_WALLET":
            return renewalWalletHandler(ctx, adapter);

        case "RENEWAL_CARD":
            return renewalCardHandler(ctx, adapter);


        // ── Admin flows ───────────────────────────────────────────────────────
        case "ADMIN_MENU":
            return adminMenuHandler(ctx, adapter);

        case "ADMIN_STATS":
            return adminStatsHandler(ctx, adapter);

        case "ADMIN_SEARCH_USER":
            return adminSearchUserHandler(ctx, adapter);

        case "ADMIN_USER_DETAIL":
            return adminUserDetailHandler(ctx, adapter);

        case "ADMIN_MANUAL_TOPUP":
            return adminManualTopupAskHandler(ctx, adapter);

        case "ADMIN_SEARCH_ORDER":
            return adminSearchOrderHandler(ctx, adapter);

        case "ADMIN_ORDER_DETAIL":
            return adminOrderDetailHandler(ctx, adapter);

        case "ADMIN_FORCE_APPROVE":
            return adminForceApproveHandler(ctx, adapter);

        case "ADMIN_FORCE_REJECT":
            return adminForceRejectHandler(ctx, adapter);

        case "ADMIN_BROADCAST":
            return adminBroadcastAskHandler(ctx, adapter);

        default:
            await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
    }
}