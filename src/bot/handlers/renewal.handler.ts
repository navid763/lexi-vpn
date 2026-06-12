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

    // Fetch subscription with its original order so we know which product it belongs to.
    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { order: { include: { product: true } } },
    });

    if (!subscription || subscription.userId !== user.id) {
        return adapter.sendMessage(ctx.chatId, "اشتراک پیدا نشد.");
    }

    // Always re-fetch the product to get its CURRENT price and availability status.
    // The original order's product data is stale — price or availability may have changed.
    const originalProductId = subscription.order.product.id;
    const currentProduct = await prisma.product.findUnique({
        where: { id: originalProductId },
    });

    // Guard: product was deleted or deactivated after the original purchase.
    if (!currentProduct || !currentProduct.isActive || currentProduct.deletedAt) {
        return adapter.sendMessage(
            ctx.chatId,
            `⚠️ متأسفانه پلن این اشتراک (${subscription.order.product.name}) دیگر در دسترس نیست.\n\n` +
            `می‌توانید یک سرویس جدید از لیست پلن‌ها خریداری کنید:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📦 مشاهده پلن‌های موجود", callback_data: "PLANS" }],
                        [{ text: "🔙 بازگشت", callback_data: "MY_SERVICES" }],
                    ],
                },
            }
        );
    }

    const isExpired = subscription.status === "EXPIRED";
    const remaining = isExpired ? "منقضی شده ❌" : getRemainingTime(subscription.expireAt);
    const priceToman = currentProduct.price / 10;

    // Show wallet balance so the user knows if they have enough before choosing
    const hasEnoughBalance = user.balance >= currentProduct.price;
    const balanceLine = hasEnoughBalance
        ? `✅ موجودی کیف پول شما: <b>${(user.balance / 10).toLocaleString()} تومان</b> (کافی است)`
        : `⚠️ موجودی کیف پول شما: <b>${(user.balance / 10).toLocaleString()} تومان</b> (ناکافی)`;

    // If the price changed since the original purchase, show a notice
    const originalPrice = subscription.order.product.price;
    const priceChangedNote =
        currentProduct.price !== originalPrice
            ? `\n⚠️ <i>قیمت این پلن از ${(originalPrice / 10).toLocaleString()} به ${priceToman.toLocaleString()} تومان تغییر کرده است.</i>`
            : "";

    await adapter.sendMessage(
        ctx.chatId,
        `🔄 <b>تمدید اشتراک</b>\n\n` +
        `📦 پلن: ${currentProduct.name}\n` +
        `⏳ اعتبار فعلی: ${remaining}\n` +
        `📅 مدت تمدید: ${currentProduct.durationDays} روز\n` +
        `💰 هزینه تمدید: <b>${priceToman.toLocaleString()} تومان</b>` +
        priceChangedNote +
        `\n\n${balanceLine}\n\n` +
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