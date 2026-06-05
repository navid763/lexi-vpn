import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { prisma } from "../../config/prisma.ts";
import { productsKeyboard } from "../utils/keyboards.ts";

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