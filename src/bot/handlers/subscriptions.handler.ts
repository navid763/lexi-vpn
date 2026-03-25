import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { SubscriptionService } from "../../services/subscription.service.ts";
import { User } from "../../models/index.ts";
import { getRemainingTime } from "../../utils/date-time.ts";

export const subscriptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const user = await User.findOne({
        where: { chat_id: ctx.chatId }
    });
    const subscriptions = await SubscriptionService.getSubscriptions(Number(user?.toJSON().id));

    if (!subscriptions.length) {
        await adapter.sendMessage(
            ctx.chatId,
            `در حال حاضر سرویسی ندارید.
                مشاهده سرویسها جهت خریداری:
                `,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📦 سرویس های موجود",
                                callback_data: "PLANS",
                            }
                        ],
                        [
                            {
                                text: "بازگشت به خانه",
                                callback_data: "HOME",
                            },
                        ]
                    ]
                }
            }
        );
        return;
    }

    await adapter.sendMessage(ctx.chatId,

        subscriptions.map((sub, i) => `${i + 1}- ♦️ بسته ${sub.traffic_limit / 1000} گیگ  ⏳ اعتبار:  ${getRemainingTime(sub.expire_at)}`)
            .join("\n \n"),
        {
            reply_markup: {
                inline_keyboard: [

                    [
                        {
                            text: "بازگشت به خانه 🏠",
                            callback_data: "HOME",
                        },
                    ]
                ]
            }
        }
    )
}