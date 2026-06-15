import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";
import { prisma } from "../../config/prisma.js";
import { getRemainingTime } from "../../utils/date-time.js";

export const profileHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });

    if (!user) {
        return adapter.sendMessage(ctx.chatId, "مشکلی پیش آمد. لطفاً /start را بزنید.");
    }

    // Fetch active subscriptions with their config
    const subscriptions = await prisma.subscription.findMany({
        where: { userId: user.id, status: "ACTIVE", deletedAt: null },
        include: {
            config: true,
            order: {
                include: { product: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Fetch last 3 orders so user can reference their order ID to admin
    const recentOrders = await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { product: true },
    });

    // ── Header ────────────────────────────────────────────────────────────────
    let text =
        `👤 <b>پروفایل من</b>\n\n` +
        `💰 موجودی کیف پول: <b>${(user.balance / 10).toLocaleString()} تومان</b>\n`;

    // ── Active subscriptions ──────────────────────────────────────────────────
    if (subscriptions.length === 0) {
        text += `\n📦 اشتراک فعال: <b>ندارید</b>\n`;
    } else {
        text += `\n📦 <b>اشتراک‌های فعال (${subscriptions.length}):</b>\n`;

        for (const [i, sub] of subscriptions.entries()) {
            text += `\n<b>${i + 1}. ${sub.order.product.name}</b>\n`;
            text += `   ⏳ اعتبار: ${getRemainingTime(sub.expireAt)}\n`;
            text += `   📶 حجم: ${sub.trafficLimit / 1000} گیگابایت\n`;

            if (sub.config) {
                // subUrl is stored directly in the DB — no reconstruction needed.
                if (sub.config.subUrl) {
                    text += `   🔗 لینک اشتراک (توصیه شده):\n<code>${sub.config.subUrl}</code>\n`;
                }
                text += `   🔐 کانفیگ مستقیم:\n<code>${sub.config.configUrl}</code>\n`;
            }
        }
    }

    // ── Recent orders ─────────────────────────────────────────────────────────
    if (recentOrders.length > 0) {
        const statusMap: Record<string, string> = {
            PENDING_PAYMENT: "⏳",
            WAITING_APPROVAL: "🔍",
            APPROVED: "✅",
            REJECTED: "❌",
            CANCELLED: "🚫",
        };

        text += `\n🧾 <b>سفارش‌های اخیر:</b>\n`;
        for (const order of recentOrders) {
            text += `   ${statusMap[order.status] ?? ""} سفارش <b>#${order.id}</b> — ${order.product.name} — ${(order.price / 10).toLocaleString()} تومان\n`;
        }

        text += `\n<i>در صورت بروز مشکل در پرداخت، شماره سفارش را به پشتیبانی اعلام کنید.</i>`;
    }

    await adapter.sendMessage(ctx.chatId, text, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "💰 اعتبار من", callback_data: "MY_BALANCE" }],
                [{ text: "🏠 خانه", callback_data: "HOME" }],
            ],
        },
    });
};
