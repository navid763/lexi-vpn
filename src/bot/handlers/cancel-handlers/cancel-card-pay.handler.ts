import type { BotAdapter } from "../../adapters/bot.adapter.ts";
import type { BotContext } from "../../types/bot.context.ts";
import { prisma } from "../../../config/prisma.ts";
import { parseCallbackData } from "../../utils/callback-data.ts";

export const cancelCardPayHandler = async (
    ctx: BotContext,
    adapter: BotAdapter
) => {
    try {
        if (!ctx.callbackData) throw new Error("callback data not found");

        const { id: orderId } = parseCallbackData(ctx.callbackData);
        if (!orderId) throw new Error("order id not found in the callback data");

        // FIX: only cancel orders that are still in a cancellable state.
        // PENDING_PAYMENT and WAITING_APPROVAL can be cancelled by the user.
        // APPROVED / REJECTED orders must not be overwritten.
        const { count } = await prisma.order.updateMany({
            where: {
                id: orderId,
                status: { in: ["PENDING_PAYMENT", "WAITING_APPROVAL"] },
            },
            data: { status: "CANCELLED" },
        });

        if (count === 0) {
            return adapter.sendMessage(
                ctx.chatId,
                `⚠️ این سفارش قبلاً پردازش شده و قابل لغو نیست.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                        ],
                    },
                }
            );
        }

        adapter.sendMessage(ctx.chatId, `سفارش شما لغو شد❌`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                ],
            },
        });
    } catch (err: any) {
        console.error("error in cancelCardPayHandler : ", err.message);
        adapter.sendMessage(ctx.chatId, `مشکلی در پروسه پیش آمد`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                ],
            },
        });
    }
};