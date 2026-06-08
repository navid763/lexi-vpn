// Entry point when user taps "تمدید" on a subscription.
// Shows the price and payment options (wallet or card).

import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { prisma } from "../../config/prisma.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { getRemainingTime } from "../../utils/date-time.ts";

export const renewalOptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) {
        return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) return adapter.sendMessage(ctx.chatId, "کاربر پیدا نشد.");

    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { order: { include: { product: true } } },
    });

    if (!subscription || subscription.userId !== user.id) {
        return adapter.sendMessage(ctx.chatId, "اشتراک پیدا نشد.");
    }

    const product = subscription.order.product;
    const priceToman = product.price / 10;
    const remaining = getRemainingTime(subscription.expireAt);

    // Show wallet balance so the user knows if they have enough
    const hasEnoughBalance = user.balance >= product.price;
    const balanceLine = hasEnoughBalance
        ? `✅ موجودی کیف پول شما: <b>${(user.balance / 10).toLocaleString()} تومان</b> (کافی است)`
        : `⚠️ موجودی کیف پول شما: <b>${(user.balance / 10).toLocaleString()} تومان</b> (ناکافی)`;

    await adapter.sendMessage(
        ctx.chatId,
        `🔄 <b>تمدید اشتراک</b>\n\n` +
        `📦 پلن: ${product.name}\n` +
        `⏳ اعتبار فعلی: ${remaining}\n` +
        `📅 مدت تمدید: ${product.durationDays} روز\n` +
        `💰 هزینه تمدید: <b>${priceToman.toLocaleString()} تومان</b>\n\n` +
        `${balanceLine}\n\n` +
        `روش پرداخت را انتخاب کنید:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `💰 پرداخت با کیف پول${hasEnoughBalance ? "" : " (موجودی ناکافی)"}`,
                            callback_data: `RENEWAL_WALLET:${subscriptionId}`,
                        },
                    ],
                    [
                        {
                            text: "💳 کارت به کارت",
                            callback_data: `RENEWAL_CARD:${subscriptionId}`,
                        },
                    ],
                    [{ text: "🔙 بازگشت", callback_data: "MY_SERVICES" }],
                ],
            },
        }
    );
};