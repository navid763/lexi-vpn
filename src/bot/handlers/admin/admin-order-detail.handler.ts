import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdminPanelService } from "../../../services/admin-panel.service.js";
import { parseCallbackData } from "../../utils/callback-data.js";
import { userSteps } from "../../utils/state.js";

// Step 1 — admin taps "Search Order" → ask for order ID
export const adminSearchOrderHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_ORDER_SEARCH");

    await adapter.sendMessage(
        ctx.chatId,
        `📦 <b>جستجوی سفارش</b>\n\nشماره سفارش را وارد کنید:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );
};

// Step 2 — admin types an order ID → show order detail
export const adminOrderSearchResultHandler = async (
    ctx: BotContext,
    adapter: BotAdapter
) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const orderId = parseInt(ctx.text ?? "");
    if (isNaN(orderId)) {
        return adapter.sendMessage(ctx.chatId, "❌ شماره سفارش نامعتبر است.");
    }

    return showOrderDetail(ctx, adapter, orderId);
};

// Called from callback ADMIN_ORDER_DETAIL:id  AND  from text search above
export const adminOrderDetailHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: orderId } = parseCallbackData(ctx.callbackData ?? "");
    if (!orderId) return adapter.sendMessage(ctx.chatId, "شناسه سفارش نامعتبر است.");

    return showOrderDetail(ctx, adapter, orderId);
};

// ── Shared rendering ──────────────────────────────────────────────────────

async function showOrderDetail(
    ctx: BotContext,
    adapter: BotAdapter,
    orderId: number
) {
    const order = await AdminPanelService.getOrderDetail(orderId);

    if (!order) {
        return adapter.sendMessage(ctx.chatId, `سفارش #${orderId} پیدا نشد.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔍 جستجوی مجدد", callback_data: "ADMIN_SEARCH_ORDER" }],
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        });
    }

    const statusMap: Record<string, string> = {
        PENDING_PAYMENT: "⏳ در انتظار پرداخت",
        WAITING_APPROVAL: "🔍 در انتظار تایید",
        APPROVED: "✅ تایید شده",
        REJECTED: "❌ رد شده",
        CANCELLED: "🚫 لغو شده",
    };

    const paymentStatus = order.payment
        ? `\n💳 پرداخت: ${order.payment.status} — ${(order.payment.amount / 10).toLocaleString()} تومان`
        : "";

    const configLine = order.subscription?.config
        ? `\n🔐 کانفیگ:\n<code>${order.subscription.config.configUrl}</code>`
        : "";

    const text =
        `📦 <b>جزئیات سفارش #${order.id}</b>\n\n` +
        `👤 کاربر: <code>${order.user.chatId}</code> ${order.user.fullName ? `(${order.user.fullName})` : ""}\n` +
        `🛒 محصول: ${order.product.name}\n` +
        `💰 مبلغ: <b>${(order.price / 10).toLocaleString()} تومان</b>\n` +
        `📋 وضعیت: ${statusMap[order.status] ?? order.status}` +
        paymentStatus +
        configLine +
        `\n📅 تاریخ: ${order.createdAt.toLocaleDateString("fa-IR")}`;

    // Build action buttons based on current order status
    const actionButtons: { text: string; callback_data: string }[][] = [];

    if (order.status === "WAITING_APPROVAL") {
        actionButtons.push([
            { text: "✅ تایید سفارش", callback_data: `ADMIN_FORCE_APPROVE:${order.id}` },
            { text: "❌ رد سفارش", callback_data: `ADMIN_FORCE_REJECT:${order.id}` },
        ]);
    }

    if (order.status === "PENDING_PAYMENT") {
        actionButtons.push([
            { text: "🚫 لغو سفارش", callback_data: `ADMIN_FORCE_REJECT:${order.id}` },
        ]);
    }

    // Always allow viewing the user's full profile
    actionButtons.push([
        { text: "👤 پروفایل کاربر", callback_data: `ADMIN_USER_DETAIL:${order.user.id}` },
    ]);
    actionButtons.push([
        { text: "🔙 منو", callback_data: "ADMIN_MENU" },
    ]);

    await adapter.sendMessage(ctx.chatId, text, {
        reply_markup: { inline_keyboard: actionButtons },
    });
}

// ── Force approve / reject (manual fix) ──────────────────────────────────

export const adminForceApproveHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: orderId } = parseCallbackData(ctx.callbackData ?? "");
    if (!orderId) return adapter.sendMessage(ctx.chatId, "شناسه سفارش نامعتبر است.");

    try {
        const result = await AdminPanelService.forceApproveOrder(orderId);

        const order = await AdminPanelService.getOrderDetail(orderId);

        // Notify admin
        await adapter.sendMessage(
            ctx.chatId,
            `✅ سفارش #${orderId} با موفقیت تایید شد.\nکانفیگ:\n<code>${result.config?.configUrl}</code>`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                    ],
                },
            }
        );

        // Notify the customer
        if (order?.user) {
            await adapter
                .sendMessage(
                    Number(order.user.chatId),
                    `✅ سفارش شما به شماره #${orderId} تایید و فعال شد.\n\n🔐 کانفیگ اتصال:\n<code>${result.config?.configUrl}</code>`
                )
                .catch((e) => console.error("Failed to notify customer on force approve:", e));
        }
    } catch (err: any) {
        const msg =
            err.message === "Order_Already_Processed"
                ? "این سفارش قبلاً پردازش شده است."
                : `❌ خطا در تایید: ${err.message}`;
        await adapter.sendMessage(ctx.chatId, msg);
    }
};

export const adminForceRejectHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: orderId } = parseCallbackData(ctx.callbackData ?? "");
    if (!orderId) return adapter.sendMessage(ctx.chatId, "شناسه سفارش نامعتبر است.");

    const success = await AdminPanelService.forceRejectOrder(orderId);
    const order = await AdminPanelService.getOrderDetail(orderId);

    if (!success) {
        return adapter.sendMessage(
            ctx.chatId,
            "⚠️ سفارش در وضعیت قابل رد نیست (احتمالاً قبلاً پردازش شده)."
        );
    }

    await adapter.sendMessage(
        ctx.chatId,
        `❌ سفارش #${orderId} رد شد.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );

    if (order?.user) {
        await adapter
            .sendMessage(
                Number(order.user.chatId),
                `❌ سفارش شما به شماره #${orderId} توسط مدیریت رد شد.\nدر صورت سوال با پشتیبانی در ارتباط باشید.`
            )
            .catch((e) => console.error("Failed to notify customer on force reject:", e));
    }
};
