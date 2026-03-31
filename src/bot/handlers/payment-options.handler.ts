import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { Product } from "../../models/index.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { payOptionsKeyboards } from "../utils/keyboards.ts";


export const paymentOptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    if (!ctx.callbackData) return;

    const { id: productId } = parseCallbackData(ctx.callbackData);
    if (!productId) {
        await adapter.sendMessage(ctx.chatId, "سرویس اننتخاب شده نامعتبر است");
        return
    }

    const product = await Product.findByPk(productId);
    if (!product) {
        await adapter.sendMessage(ctx.chatId, "سرویس پیدا نشد");
        return
    }



    await adapter.sendMessage(ctx.chatId,
        "یکی از روشهای پرداخت را انتخاب کنید:",
        {
            reply_markup: payOptionsKeyboards(productId)
        }
    );

}