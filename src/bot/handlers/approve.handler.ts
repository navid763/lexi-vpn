import { AdminService } from "../../services/admin.service.ts";
import { prisma } from "../../config/prisma.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";

export const approveOrderHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    const [action, orderIdRaw] = ctx.callbackData.split(":");
    const orderId = Number(orderIdRaw);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
        console.log("order not found - [bot-handlers-approveHandler]");
        return;
    }

    const customer = await prisma.user.findUnique({ where: { id: order.userId } });
    if (!customer) {
        console.log("user not found - [bot-handlers-approveHandler]");
        return;
    }

    if (action === "APPROVE") {
        try {
            const result = await AdminService.approveOrder(orderId);

            await adapter.sendMessage(
                ctx.chatId,
                `✅ سفارش ${orderId} تایید شد\nکاربر: ${customer.chatId}`
            );

            await adapter.sendMessage(
                Number(customer.chatId),
                `سفارش شما به شماره ${orderId} تایید شد\n✅ پرداخت شما تایید شد و سرویس فعال شد.\nکانفیگ شما:`
            );

            await adapter.sendMessage(
                Number(customer.chatId),
                `${result.config.configUrl}`
            );
        } catch (error: any) {
            if (error.message === "Order_Already_Processed") {
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
            } else {
                console.error("Error approving order:", error);
                await adapter.sendMessage(ctx.chatId, "خطایی در تایید سفارش رخ داد.");
            }
        }
    }

    if (action === "REJECT") {
        try {
            if (order.status !== "WAITING_APPROVAL") {
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
                return;
            }

            await prisma.order.update({
                where: { id: orderId },
                data: { status: "REJECTED" },
            });

            await adapter.sendMessage(ctx.chatId, `❌ سفارش ${orderId} رد شد`);

            await adapter.sendMessage(
                Number(customer.chatId),
                `سفارش شما ${orderId} رد شد`
            );
        } catch (error: any) {
            console.error("Error rejecting order:", error);
            await adapter.sendMessage(ctx.chatId, "خطایی در لغو سفارش رخ داد.");
        }
    }
};