import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { OrderService } from "../../services/order.service.ts";
import { prisma } from "../../config/prisma.ts";
import { approveOrderByWallet } from "../utils/pay-by-wallet.ts";

const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

export const walletPayHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    const { id: productId } = parseCallbackData(ctx.callbackData);
    if (!productId) {
        await adapter.sendMessage(
            ctx.chatId,
            `سرویس انتخاب‌شده نامعتبر است.\nلطفاً دوباره از لیست سرویس‌ها انتخاب کنید.`
        );
        return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        await adapter.sendMessage(
            ctx.chatId,
            `این سرویس در حال حاضر در دسترس نیست.\nلطفاً یکی از سرویس‌های دیگر را انتخاب کنید.`
        );
        return;
    }

    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) {
        console.log("user not found");
        await adapter.sendMessage(ctx.chatId, "مشکلی پیش آمد. بعدا مجددا تلاش کنید");
        return;
    }

    const order = await OrderService.createOrder(user.id, productId);

    try {
        const response = await approveOrderByWallet(order.id, ctx.chatId, adapter);

        if (!response.success) {
            if (response.reason === "insufficient_balance_[approveOrderByWallet]") {
                console.log("Order rejected due to low balance.");
            } else {
                console.error(`Business Logic Error: ${response.reason}`);
                await adapter.sendMessage(ctx.chatId, "خطایی در پردازش سفارش رخ داد.");
            }
            return;
        }

        const { order: approvedOrder, config } = response.result;

        await adapter.sendMessage(
            ADMIN_CHAT_ID,
            `✅ سفارش تایید شد\n\nOrder ID: ${approvedOrder.id}\nUser: ${ctx.chatId}\nPayment: Wallet\nAmount: ${approvedOrder.price}`
        );

        await adapter.sendMessage(
            Number(ctx.chatId),
            `✅ سفارش شما با موفقیت ثبت و فعال شد.\n\nشماره سفارش: ${approvedOrder.id}\n\n🔐 کانفیگ اتصال شما:\n\n${config.configUrl}\n`
        );

        await adapter.sendMessage(Number(ctx.chatId), `${config.configUrl}`);

        await adapter.sendMessage(
            Number(ctx.chatId),
            `تشکر از حسن اعتماد شما.\nدر صورت بروز هر گونه مشکل با پشتیبانی تماس بگیرید`
        );
    } catch (error: any) {
        console.error("Critical Error approving order:", error);
        await adapter.sendMessage(
            Number(ADMIN_CHAT_ID),
            `❌ خطا در سیستم حین تایید سفارش\n\nOrder: ${order.id}\nUser: ${ctx.chatId}`
        );
    }
};