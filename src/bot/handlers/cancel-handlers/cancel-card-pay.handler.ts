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

        // Verify the order exists before attempting the update.
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error("order not found");

        await prisma.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED" },
        });

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