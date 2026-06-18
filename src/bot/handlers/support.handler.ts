import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { productsKeyboard } from "../utils/keyboards.js";

export const supportHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    await adapter.sendMessage(ctx.chatId,
        `<b>🌐 پشتیبانی Lexi</b>

کاربر گرامی، برای حل مشکلات فنی، تمدید اکانت یا طرح هرگونه سوال، تیم پشتیبانی ما در کنار شماست.

<b>💬 راه‌های ارتباطی با ما:</b>
👤 <b> پشتیبانی:</b> @Lexi_support
⏱ <b>ساعات پاسخگویی:</b> ۹ صبح الی ۲ بامداد

<i>⚡️ پاسخگویی در سریع‌ترین زمان ممکن انجام می‌شود.</i>
لطفا صبور باشید 
        `,
    );
};
