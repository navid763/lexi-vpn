import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";

export const checkWalletBalanceHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    try {
        const user = await prisma.user.findUnique({
            where: { chatId: String(ctx.chatId) },
        });
        if (!user) throw new Error("user not found - [balance-handler]");

        const balance = user.balance;

        await adapter.sendMessage(
            ctx.chatId,
            `اعتبار شما:   ${balance === 0 || !balance ? 0 : (balance / 10).toLocaleString()} تومان💸\n\nهمچنین میتوانید اقدام به شارژ حساب خود کنید.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "افزایش اعتبار", callback_data: "INNCREASE_BALANCE" }],
                        [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );
    } catch (err) {
        console.error(err);
        await adapter.sendMessage(
            ctx.chatId,
            "مشکلی در پردازش اعتبار پیش آمد. لطفا بعدا مجددا تلاش کنید"
        );
    }
};
