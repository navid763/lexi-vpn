import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { Product } from "../../models/index.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { OrderService } from "../../services/order.service.ts";



export const selectProductHandler = async (ctx: BotContext, adapter: BotAdapter) => {

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

    //     const user = await User.findOne({
    //     where: { chat_id: ctx.chatId },
    //   });

    const order = await OrderService.createOrder(ctx.chatId, productId);

    await adapter.sendMessage(ctx.chatId,
        `✅ سفارش ایجاد شد

📦 سرویس: ${product.name}
💰 مبلغ: ${product.price} تومان

لطفاً رسید پرداخت را ارسال کنید.`
    )
}