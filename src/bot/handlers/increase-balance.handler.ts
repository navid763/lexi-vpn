import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { userSteps } from "../utils/state.ts";


export const increaseBalanceHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    try {

        userSteps.set(String(ctx.chatId), "AWAITING_TOPUP_AMOUNT");

        adapter.sendMessage(ctx.chatId,
            "لطفا مبلغ دلخواه خود را به تومان وارد کنید(حداقل 10,000 تومان) و در یک پیام ارسال کنید",

            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "لغو عملیات ❌",
                                callback_data: `HOME`,
                            }
                        ]
                    ]
                }
            }
        );

    } catch (error) {
        console.error("error during increaseBalanceHandler: ", error);
        userSteps.delete(String(ctx.chatId));
    }
}