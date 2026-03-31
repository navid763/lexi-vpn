import type { BotAdapter } from "../../adapters/bot.adapter.ts";
import type { BotContext } from "../../types/bot.context.ts";
import { Payment } from "../../../models/index.ts";
import { parseCallbackData } from "../../utils/callback-data.ts";
import { userSteps } from "../../utils/state.ts";



export const cancellWalletTopUpAmountHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    try {
        userSteps.delete(String(ctx.chatId));

        if (!ctx.callbackData) throw new Error("callback data not found");

        const { id: paymentId } = parseCallbackData(ctx.callbackData);

        if (!paymentId) throw new Error("payment id not found in the callback data");

        const payment = await Payment.update(
            { status: "cancelled" },
            { where: { id: paymentId } }
        );
        if (!payment) throw new Error("payment not found");

        adapter.sendMessage(ctx.chatId,
            `عملیات پرداخت شما لغو شد❌`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "بازگشت به خانه",
                                callback_data: "HOME",
                            }
                        ]
                    ]
                }
            }
        );

    } catch (err: any) {
        console.error("error in cancellWalletTopUpAmountHandler : ", err.message);
        adapter.sendMessage(ctx.chatId,
            `مشکلی در پروسه پیش آمد`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "بازگشت به خانه",
                                callback_data: "HOME",
                            }
                        ]
                    ]
                }
            }
        );
    }

}