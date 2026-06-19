import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { parseCallbackData } from "../utils/callback-data.js";
import { OrderService } from "../../services/order.service.js";
import { SettingsService } from "../../services/settings.service.js";

export const cardPayHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    if (await SettingsService.isMaintenanceMode()) {
        return adapter.sendMessage(ctx.chatId, "🛠 ربات موقتاً در حال بروزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.");
    }

    const { cardNumber, cardOwner } = await SettingsService.getCardInfo();

    const { id: productId } = parseCallbackData(ctx.callbackData);
    if (!productId) {
        await adapter.sendMessage(ctx.chatId, "سرویس اننتخاب شده نامعتبر است");
        return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        await adapter.sendMessage(ctx.chatId, "سرویس پیدا نشد");
        return;
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) {
        console.log("user not found");
        return;
    }

    const order = await OrderService.createOrder(user.id, productId);

    await adapter.sendMessage(
        ctx.chatId,
        `✅ سفارش ایجاد شد\n\n📦 سرویس: ${product.name}\n💰 مبلغ: ${(product.price / 10).toLocaleString()} تومان\n\nلطفاً رسید پرداخت را حداکثر تا 10 دقیقه ارسال کنید.`
    );

    await adapter.sendMessage(
        ctx.chatId,
        `شماره کارت:\n<code>${cardNumber}</code> \n <code>${cardOwner}</code>`, // شماره کارت داخل تگ code قرار گرفت
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

};
