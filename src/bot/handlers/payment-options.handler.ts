import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { parseCallbackData } from "../utils/callback-data.js";
import { payOptionsKeyboards } from "../utils/keyboards.js";

export const paymentOptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    const { id: productId } = parseCallbackData(ctx.callbackData);
    if (!productId) {
        await adapter.sendMessage(ctx.chatId, "سرویس اننتخاب شده نامعتبر است");
        return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        await adapter.sendMessage(ctx.chatId, "سرویس پیدا نشد");
        return;
    }

    await adapter.sendMessage(ctx.chatId, "یکی از روشهای پرداخت را انتخاب کنید:", {
        reply_markup: payOptionsKeyboards(productId),
    });
};
