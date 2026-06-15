import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { parseCallbackData } from "../utils/callback-data.js";
import { OrderService } from "../../services/order.service.js";
import { prisma } from "../../config/prisma.js";
import { approveOrderByWallet } from "../utils/pay-by-wallet.js";

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
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "CANCELLED" },
                }).catch((e) => console.error("Failed to cancel dangling order:", e));

                await adapter.sendMessage(ctx.chatId, "اعتبار کیف پول شما کافی نیست \n اعتبار کیف پولتان را افزایش دهید");
                console.log("Order rejected due to low balance.");
            } else {
                console.error(`Business Logic Error: ${response.reason}`);
                await adapter.sendMessage(ctx.chatId, "خطایی در پردازش سفارش رخ داد.");
            }
            return;
        }

        const { order: approvedOrder, config } = response.result;

        // Notify admin (non-blocking)
        if (ADMIN_CHAT_ID) {
            adapter
                .sendMessage(
                    ADMIN_CHAT_ID,
                    `✅ سفارش تایید شد\n\nOrder ID: ${approvedOrder.id}\nUser: ${ctx.chatId}\nPayment: Wallet\nAmount: ${(approvedOrder.price / 10).toLocaleString()} تومان`
                )
                .catch(() => { });
        }

        // ── Deliver config to the user ────────────────────────────────────────
        await adapter.sendMessage(
            ctx.chatId,
            `✅ سفارش شما با موفقیت ثبت و فعال شد.\n\n` +
            `شماره سفارش: ${approvedOrder.id}\n\n` +
            `📋 راهنما:\n` +
            `۱. لینک اشتراک را در کلاینت خود وارد کنید (توصیه شده — کانفیگ به‌روزرسانی می‌شود)\n` +
            `۲. یا مستقیماً کانفیگ زیر را import کنید`
        );

        // Subscription link (auto-updates on panel side)
        if ((config as any).subUrl) {
            await adapter.sendMessage(
                ctx.chatId,
                `🔗 <b>لینک اشتراک:</b>\n<code>${(config as any).subUrl}</code>`
            );
        }

        // Direct import URI
        await adapter.sendMessage(
            ctx.chatId,
            `🔐 <b>کانفیگ مستقیم:</b>\n<code>${config.configUrl}</code>`
        );

        await adapter.sendMessage(
            ctx.chatId,
            `تشکر از حسن اعتماد شما.\nدر صورت بروز هر گونه مشکل با پشتیبانی تماس بگیرید`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📋 سرویس‌های من", callback_data: "MY_SERVICES" }],
                        [{ text: "🏠 خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );
    } catch (error: any) {
        await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
        }).catch((e) => console.error("Failed to cancel order after critical error:", e));

        console.error("Critical Error approving order:", error);

        if (ADMIN_CHAT_ID) {
            adapter
                .sendMessage(
                    ADMIN_CHAT_ID,
                    `❌ خطا در سیستم حین تایید سفارش\n\nOrder: ${order.id}\nUser: ${ctx.chatId}\nError: ${error.message}`
                )
                .catch(() => { });
        }

        await adapter.sendMessage(
            ctx.chatId,
            "❌ خطایی در فعال‌سازی سرویس رخ داد. سفارش لغو شد.\nلطفاً با پشتیبانی تماس بگیرید."
        );
    }
};
