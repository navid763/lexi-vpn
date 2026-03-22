import { AdminService } from "../../services/admin.service.ts";
import { Order, User } from "../../models/index.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";


export const approveOrderHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    const [action, orderIdRaw] = ctx.callbackData.split(":");
    const orderId = Number(orderIdRaw);

    const order = await Order.findByPk(orderId);
    if (!order) {
        console.log("order not found - [bot-handlers-approveHandler]");
        return
    }
    const costumer = await User.findOne({
        where: { id: order?.toJSON().user_id }
    });

    if (!costumer) {
        console.log("user not found - [bot-handlers-approveHandler]");
        return
    }

    if (action === "APPROVE") {
        try {
            const result = await AdminService.approveOrder(orderId);

            await adapter.sendMessage(
                ctx.chatId,
                `✅ سفارش ${orderId} تایید شد
                کاربر: ${costumer.toJSON().chat_id}
                `
            );


            await adapter.sendMessage(
                Number(costumer.toJSON().chat_id),
                `سفارش شما به شماره ${orderId} تایید شد
                ✅ پرداخت شما تایید شد و سرویس فعال شد.
            کانفیگ شما:`
            );
            await adapter.sendMessage(
                Number(costumer.toJSON().chat_id),
                `${result.config.config_url}
            `
            );


        } catch (error: any) {
            if (error.message === "Order_Already_Processed") {
                // پیام به ادمینی که دیرتر کلیک کرده یا دوباره کلیک کرده
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
            } else {
                console.error("Error approving order:", error);
                await adapter.sendMessage(ctx.chatId, "خطایی در تایید سفارش رخ داد.");
            }
        }
    }

    if (action === "REJECT") {
        await Order.update(
            { status: "rejected" },
            { where: { id: orderId } }
        );

        await adapter.sendMessage(
            ctx.chatId,
            `❌ سفارش ${orderId} رد شد`
        );

        await adapter.sendMessage(Number(costumer.toJSON().chat_id),
            `سفارش شما ${orderId} رد شد
            `
        );
    }
}