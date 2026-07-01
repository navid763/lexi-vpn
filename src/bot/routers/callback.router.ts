import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { parseCallbackData } from "../utils/callback-data.js";

// Existing handlers
import { plansHandler } from "../handlers/plans.handler.js";
import { startHandler } from "../handlers/start.handler.js";
import { cardPayHandler } from "../handlers/card-pay.handler.js";
import { approveOrderHandler } from "../handlers/approve.handler.js";
import { subscriptionsHandler } from "../handlers/subscriptions.handler.js";
import { checkWalletBalanceHandler } from "../handlers/check-wallet.handler.js";
import { paymentOptionsHandler } from "../handlers/payment-options.handler.js";
import { walletPayHandler } from "../handlers/wallet-pay.handler.js";
import { increaseBalanceHandler } from "../handlers/increase-balance.handler.js";
import { approveTopupHandler } from "../handlers/approve-walet-topup.handler.js";
import { getMyRefCodeHandler } from "../handlers/get-referral-code.handler.js";
import { cancellWalletTopUpAmountHandler } from "../handlers/cancel-handlers/cancel-wallet-topup-amount.handler.js";
import { cancelCardPayHandler } from "../handlers/cancel-handlers/cancel-card-pay.handler.js";
import { profileHandler } from "../handlers/profile.handler.js";
import { supportHandler } from "../handlers/support.handler.js";
import { qaHandler } from "../handlers/Q-A.handler.js";
import { testConfigHandler } from "../handlers/test-config.handler.js";

// Admin handlers
import { adminMenuHandler } from "../handlers/admin/admin-menu.handler.js";
import { adminStatsHandler } from "../handlers/admin/admin-stats.handler.js";
import { adminSearchUserHandler } from "../handlers/admin/admin-search-user.handler.js";
import {
    adminUserDetailHandler,
    adminManualTopupAskHandler,
    adminUserBlockToggleHandler,
    adminDmAskHandler,
} from "../handlers/admin/admin-user-detail.handler.js";
import {
    adminSearchOrderHandler,
    adminOrderDetailHandler,
    adminForceApproveHandler,
    adminForceRejectHandler,
} from "../handlers/admin/admin-order-detail.handler.js";
import { adminBroadcastAskHandler } from "../handlers/admin/admin-broadcast.handler.js";

import { renewalOptionsHandler } from "../handlers/renewal.handler.js";
import { renewalWalletHandler, renewalCardHandler } from "../handlers/renewal-pay.handler.js";
import { adminEditCardAskHandler } from "../handlers/admin/admin-card.handler.js";

import {
    adminProductListHandler,
    adminProductDetailHandler,
    adminProductToggleHandler,
    adminProductDeleteHandler,
    adminProductCreateAskHandler,
    adminProductEditPriceAskHandler,
} from "../handlers/admin/admin-product.handler.js";

import {
    adminSubCancelAskHandler,
    adminSubCancelConfirmHandler
} from "../handlers/admin/admin-subscription.handler.js";

import { adminMaintenanceToggleHandler } from "../handlers/admin/admin-maintenance-toggle.handler.js";
import {
    adminSubExtendAskHandler,
    adminBulkExtendAskTargetsHandler
} from "../handlers/admin/admin-sub-extend.handler.js";

import {
    adminAdLinkListHandler,
    adminAdLinkCreateAskHandler,
} from "../handlers/admin/admin-ad-links.handler.js";


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

        case "SUPPORT":
            return supportHandler(ctx, adapter);

        case "QA":
            return qaHandler(ctx, adapter);

        case "TEST_CONFIG":
            return testConfigHandler(ctx, adapter);


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

        case "ADMIN_EDIT_CARD":
            return adminEditCardAskHandler(ctx, adapter);

        // admin modify plans:

        case "ADMIN_PRODUCTS":
            return adminProductListHandler(ctx, adapter);

        case "ADMIN_PRODUCT_DETAIL":
            return adminProductDetailHandler(ctx, adapter);

        case "ADMIN_PRODUCT_TOGGLE":
            return adminProductToggleHandler(ctx, adapter);

        case "ADMIN_PRODUCT_DELETE":
            return adminProductDeleteHandler(ctx, adapter);

        case "ADMIN_PRODUCT_CREATE":
            return adminProductCreateAskHandler(ctx, adapter);

        case "ADMIN_PRODUCT_EDIT_PRICE":
            return adminProductEditPriceAskHandler(ctx, adapter);

        case "ADMIN_USER_BLOCK_TOGGLE":
            return adminUserBlockToggleHandler(ctx, adapter);

        case "ADMIN_DM_USER":
            return adminDmAskHandler(ctx, adapter);

        case "ADMIN_SUB_CANCEL":
            return adminSubCancelAskHandler(ctx, adapter);

        case "ADMIN_SUB_CANCEL_CONFIRM":
            return adminSubCancelConfirmHandler(ctx, adapter);

        case "ADMIN_MAINTENANCE_TOGGLE":
            return adminMaintenanceToggleHandler(ctx, adapter);

        case "ADMIN_SUB_EXTEND":
            return adminSubExtendAskHandler(ctx, adapter);

        case "ADMIN_BULK_EXTEND":
            return adminBulkExtendAskTargetsHandler(ctx, adapter);

        case "ADMIN_AD_LINKS":
            return adminAdLinkListHandler(ctx, adapter);

        case "ADMIN_AD_LINK_CREATE":
            return adminAdLinkCreateAskHandler(ctx, adapter);


        default:
            await adapter.sendMessage(ctx.chatId, "دستور نامعتبر.");
    }
}
