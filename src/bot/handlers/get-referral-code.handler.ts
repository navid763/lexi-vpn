import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";

const REWARD = Number(process.env.REFFERAL_REWARD) || 0;

export const getMyRefCodeHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    try {
        const user = await prisma.user.findUnique({
            where: { chatId: String(ctx.chatId) },
        });
        if (!user) throw new Error("user not found");

        // Count how many users were invited by this user.
        // Prisma's count() is more efficient than findAndCountAll() — it issues a
        // SELECT COUNT(*) rather than fetching all rows and counting in JS.
        const referralCount = await prisma.user.count({
            where: { invitedById: user.id },
        });

        await adapter.sendMessage(
            ctx.chatId,
            `💎 با اشتراک گداری کد زیر، دوستان خود را با ما آشنا کنید. 💎\n\n` +
            `با عضویت موفق دوستانتان مقدار 💝 ${(REWARD / 10).toLocaleString()} تومان 💝 به شما تعلق خواهد گرفت.\n\n` +
            `تعداد دعوت موفق شما:  ${referralCount}\n\n` +
            `لینک دعوت شما:`
        );

        await adapter.sendMessage(
            ctx.chatId,
            `https://ble.ir/lexibot?start=${user.referralCode}`
        );
    } catch (err) {
        console.error("error during getMyRefCodeHandler: ", err);
        return adapter.sendMessage(
            ctx.chatId,
            "مشکلی در پروسه پیش آمد. مجددا بعدا تلاش کنید"
        );
    }
};
