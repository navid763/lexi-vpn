import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { Product, User } from "../../models/index.ts";
import { parseCallbackData } from "../utils/callback-data.ts";
import { OrderService } from "../../services/order.service.ts";



export const cardPayHandler = async (ctx: BotContext, adapter: BotAdapter) => {

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

    const user = await User.findOne({
        where: { chat_id: ctx.chatId },
    });

    if (!user) {
        console.log("user not found");
        return
    }

    const order = await OrderService.createOrder(user.toJSON().id, productId);

    await adapter.sendMessage(ctx.chatId,
        `✅ سفارش ایجاد شد

📦 سرویس: ${product.toJSON().name}
💰 مبلغ: ${product.toJSON().price} تومان

لطفاً رسید پرداخت را حداکثر تا 10 دقیقه ارسال کنید.`
    );

    await adapter.sendMessage(ctx.chatId,
        `شماره کارت:
       1234 **** **** 4321`,

        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "لغو عملیات ❌",
                            callback_data: `CANCEL_CARD_PAY:${order.dataValues.id}`,
                        }
                    ]
                ]
            }
        }
    );



}