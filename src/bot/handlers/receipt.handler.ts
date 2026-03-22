import { Order, User } from "../../models/index.ts";
import { PaymentService } from "../../services/payment.service.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { Op } from "sequelize";

const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

export async function receiptHandler(ctx: BotContext, adapter: BotAdapter) {
    const user = await User.findOne({
        where: { chat_id: ctx.chatId }
    });

    if (!user) {
        console.log("user not found");
        return
    }

    const order = await Order.findOne({
        where: {
            user_id: user.toJSON().id,
            status: "pending_payment",
            created_at: {
                [Op.gte]: Date.now() - 10 * 60 * 1000  // ۱۰ دقیقه اخیر
            }
        }
    });


    if (!order) {

        return adapter.sendMessage(ctx.chatId, "شما فعلاً سفارشی برای پرداخت ندارید یا زمان پرداخت تمام شده است. لطفا از ابتدا /start کنید.");
    }

    await PaymentService.submitPayment(
        order.toJSON().id,
        1,
        ctx.photo
    );

    await adapter.sendMessage(
        ctx.chatId,
        "✅ رسید دریافت شد.\n\nپس از بررسی ادمین سرویس فعال می‌شود."
    );

    const order2 = await Order.findOne({
        where: {
            user_id: user.toJSON().id,
            status: "waiting_approval",
        }
    });

    // send receipt to admin
    if (!ADMIN_CHAT_ID) {
        console.error("admin id is not valid");
        return
    }


    if (ctx.photo) {
        await adapter.sendPhoto(
            ADMIN_CHAT_ID,
            ctx.photo,
            `
       سفارش جدید
       شماره سفارش: ${order.toJSON().id}
       کاربر: ${ctx.chatId}
       تایید؟
       `,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "✅ تایید",
                                callback_data: `APPROVE:${order.toJSON().id}`
                            },
                            {
                                text: "❌ رد",
                                callback_data: `REJECT:${order.toJSON().id}`
                            }
                        ]
                    ]
                }
            }

        );
    }
}