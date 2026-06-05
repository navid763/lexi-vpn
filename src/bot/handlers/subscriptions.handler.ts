import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { SubscriptionService } from "../../services/subscription.service.ts";
import { prisma } from "../../config/prisma.ts";
import { getRemainingTime } from "../../utils/date-time.ts";

export const subscriptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });

    // If the user somehow doesn't exist yet, bail early gracefully.
    if (!user) {
        await adapter.sendMessage(ctx.chatId, "مشکلی پیش آمد. بعدا مجددا تلاش کنید");
        return;
    }

    const subscriptions = await SubscriptionService.getSubscriptions(user.id);

    if (!subscriptions.length) {
        await adapter.sendMessage(
            ctx.chatId,
            `در حال حاضر سرویسی ندارید.\nمشاهده سرویسها جهت خریداری:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📦 سرویس های موجود", callback_data: "PLANS" }],
                        [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );
        return;
    }

    await adapter.sendMessage(
        ctx.chatId,
        subscriptions
            .map(
                (sub, i) =>
                    `${i + 1}- ♦️ بسته ${sub.trafficLimit / 1000} گیگ  ⏳ اعتبار:  ${getRemainingTime(sub.expireAt)}`
            )
            .join("\n \n"),
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "بازگشت به خانه 🏠", callback_data: "HOME" }],
                ],
            },
        }
    );
};