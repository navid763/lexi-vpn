import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";
import { prisma } from "../../config/prisma.js";
import { parseCallbackData } from "../utils/callback-data.js";
import { RenewalService } from "../../services/renewal.service.js";
import { getRemainingTime } from "../../utils/date-time.js";
import { SettingsService } from "../../services/settings.service.js";

const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

// ── Wallet payment — instant ──────────────────────────────────────────────

export const renewalWalletHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    if (await SettingsService.isMaintenanceMode()) {
        return adapter.sendMessage(ctx.chatId, "🛠 ربات موقتاً در حال بروزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.");
    }

    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) {
        return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) return adapter.sendMessage(ctx.chatId, "کاربر پیدا نشد.");

    try {
        const { subscription, product } = await RenewalService.renewByWallet(
            subscriptionId,
            user.id
        );

        await adapter.sendMessage(
            ctx.chatId,
            `✅ <b>اشتراک شما با موفقیت تمدید شد!</b>\n\n` +
            `📦 پلن: ${product.name}\n` +
            `⏳ اعتبار جدید: <b>${getRemainingTime(subscription.expireAt)}</b>\n\n` +
            `🔐 کانفیگ شما تغییری نکرده — همان لینک قبلی معتبر است.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📋 سرویس‌های من", callback_data: "MY_SERVICES" }],
                        [{ text: "🏠 خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );

        // Notify admin silently (non-blocking)
        if (ADMIN_CHAT_ID) {
            await adapter
                .sendMessage(
                    ADMIN_CHAT_ID,
                    `🔄 تمدید کیف پول\n\nکاربر: <code>${ctx.chatId}</code>\nپلن: ${product.name}\nمبلغ: ${(product.price / 10).toLocaleString()} تومان\nاشتراک: #${subscriptionId}`
                )
                .catch(() => { });
        }
    } catch (err: any) {
        if (err.message === "INSUFFICIENT_BALANCE") {
            return adapter.sendMessage(
                ctx.chatId,
                `❌ موجودی کیف پول شما کافی نیست.\n\nبرای شارژ کیف پول اقدام کنید:`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💰 افزایش اعتبار", callback_data: "INNCREASE_BALANCE" }],
                            [{ text: "🔙 بازگشت", callback_data: "MY_SERVICES" }],
                        ],
                    },
                }
            );
        }
        console.error("renewalWalletHandler error:", err);
        await adapter.sendMessage(ctx.chatId, "❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    }
};

// ── Card payment — creates a renewal order, user sends receipt ────────────

export const renewalCardHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    if (await SettingsService.isMaintenanceMode()) {
        return adapter.sendMessage(ctx.chatId, "🛠 ربات موقتاً در حال بروزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.");
    }

    const { cardNumber, cardOwner } = await SettingsService.getCardInfo();

    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) {
        return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) return adapter.sendMessage(ctx.chatId, "کاربر پیدا نشد.");

    try {
        const order = await RenewalService.createRenewalOrder(subscriptionId, user.id);

        await adapter.sendMessage(
            ctx.chatId,
            `✅ <b>درخواست تمدید ثبت شد</b>\n\n` +
            `📦 پلن: ${order.product.name}\n` +
            `💰 مبلغ: <b>${(order.price / 10).toLocaleString()} تومان</b>\n\n` +
            `لطفاً مبلغ را به شماره کارت  💳زیر واریز کرده و رسید را حداکثر ظرف ۱۰ دقیقه ارسال کنید:\n\n` +
            `${cardNumber} \n ${cardOwner}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "لغو عملیات ❌",
                                callback_data: `CANCEL_CARD_PAY:${order.id}`,
                            },
                        ],
                    ],
                },
            }
        );
    } catch (err: any) {
        console.error("renewalCardHandler error:", err);
        await adapter.sendMessage(ctx.chatId, "❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    }
};
