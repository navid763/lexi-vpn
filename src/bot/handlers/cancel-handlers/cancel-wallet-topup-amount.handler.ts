import type { BotAdapter } from "../../adapters/bot.adapter.ts";
import type { BotContext } from "../../types/bot.context.ts";
import { prisma } from "../../../config/prisma.ts";
import { parseCallbackData } from "../../utils/callback-data.ts";
import { userSteps } from "../../utils/state.ts";

export const cancellWalletTopUpAmountHandler = async (
    ctx: BotContext,
    adapter: BotAdapter
) => {
    try {
        userSteps.delete(String(ctx.chatId));

        if (!ctx.callbackData) throw new Error("callback data not found");

        const { id: paymentId } = parseCallbackData(ctx.callbackData);
        if (!paymentId) throw new Error("payment id not found in the callback data");

        // FIX: use updateMany with a status guard so we only cancel PENDING payments.
        // If the admin already approved/rejected it while the user was reading the
        // message, we don't overwrite that decision.
        const { count } = await prisma.payment.updateMany({
            where: { id: paymentId, status: "PENDING" },
            data: { status: "CANCELLED" },
        });

        if (count === 0) {
            // Payment was already processed — inform the user rather than silently failing.
            return adapter.sendMessage(
                ctx.chatId,
                `⚠️ این عملیات قبلاً پردازش شده است.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                        ],
                    },
                }
            );
        }

        adapter.sendMessage(ctx.chatId, `عملیات پرداخت شما لغو شد❌`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                ],
            },
        });
    } catch (err: any) {
        console.error("error in cancellWalletTopUpAmountHandler : ", err.message);
        adapter.sendMessage(ctx.chatId, `مشکلی در پروسه پیش آمد`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                ],
            },
        });
    }
};