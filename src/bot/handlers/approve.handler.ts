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

            await adapter.sendMessage(Number(customer.chatId), `${result.config.configUrl}`);
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
            // FIX: replace the read-then-write pattern with a conditional UPDATE that
            // only succeeds if the order is still in WAITING_APPROVAL. This prevents
            // a race where two admins reject simultaneously, or one approves while
            // another is rejecting. Prisma returns the updated record count via
            // updateMany with a where clause — if count === 0 the order was already
            // processed.
            const { count } = await prisma.order.updateMany({
                where: { id: orderId, status: "WAITING_APPROVAL" },
                data: { status: "REJECTED" },
            });

            if (count === 0) {
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
                return;
            }

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