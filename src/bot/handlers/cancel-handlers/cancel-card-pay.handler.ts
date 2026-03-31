import type { BotAdapter } from "../../adapters/bot.adapter.ts";
import type { BotContext } from "../../types/bot.context.ts";
import { Order } from "../../../models/index.ts";
import { parseCallbackData } from "../../utils/callback-data.ts";



export const cancelCardPayHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    try {
        if (!ctx.callbackData) throw new Error("callback data not found");

        const { id: orderId } = parseCallbackData(ctx.callbackData);

        if (!orderId) throw new Error("order id not found in the callback data");

        const order = await Order.update(
            { status: "cancelled" },
            { where: { id: orderId } }
        );
        if (!order) throw new Error("order not found");

        adapter.sendMessage(ctx.chatId,
            ` سفارش شما لغو شد❌`,
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