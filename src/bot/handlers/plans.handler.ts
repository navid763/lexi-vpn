import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { productsKeyboard } from "../utils/keyboards.js";

export const plansHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const products = await prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
    });

    if (!products.length) {
        await adapter.sendMessage(ctx.chatId, "در حال حاضر پلنی موجود نیست.");
        return;
    }

    await adapter.sendMessage(ctx.chatId, "📦 یکی از سرویس ها را انتخاب کنید:", {
        reply_markup: productsKeyboard(products),
    });
};
