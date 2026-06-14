import { AdminService } from "../../services/admin.service.ts";
import { prisma } from "../../config/prisma.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { getRemainingTime } from "../../utils/date-time.ts";

export const approveOrderHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!ctx.callbackData) return;

    const [action, orderIdRaw] = ctx.callbackData.split(":");
    const orderId = Number(orderIdRaw);

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { product: true },
    });
    if (!order) {
        console.log("order not found - [approveOrderHandler]");
        return;
    }

    const customer = await prisma.user.findUnique({ where: { id: order.userId } });
    if (!customer) {
        console.log("user not found - [approveOrderHandler]");
        return;
    }

    if (action === "APPROVE") {
        try {
            const result = await AdminService.approveOrder(orderId);

            if (result.isRenewal) {
                // ── Renewal approval ───────────────────────────────────────────────
                await adapter.sendMessage(
                    ctx.chatId,
                    `✅ تمدید سفارش #${orderId} تایید شد\nکاربر: ${customer.chatId}`
                );

                const newExpiry = result.subscription.expireAt;
                await adapter
                    .sendMessage(
                        Number(customer.chatId),
                        `✅ <b>تمدید اشتراک شما تایید شد!</b>\n\n` +
                        `📦 پلن: ${order.product.name}\n` +
                        `⏳ اعتبار جدید: <b>${getRemainingTime(newExpiry)}</b>\n\n` +
                        `🔐 کانفیگ شما تغییری نکرده — همان لینک قبلی معتبر است.`
                    )
                    .catch((e) => console.error("Failed to notify customer of renewal:", e));
            } else {
                // ── New order approval ─────────────────────────────────────────────
                await adapter.sendMessage(
                    ctx.chatId,
                    `✅ سفارش #${orderId} تایید شد\nکاربر: ${customer.chatId}`
                );

                await adapter
                    .sendMessage(
                        Number(customer.chatId),
                        `✅ سفارش شما به شماره #${orderId} تایید شد.\n\n` +
                        `📋 راهنما:\n` +
                        `۱. لینک اشتراک را در کلاینت خود وارد کنید (توصیه شده)\n` +
                        `۲. یا مستقیماً کانفیگ زیر را import کنید`
                    )
                    .catch(() => { });

                // Subscription link
                if (result.config && (result.config as any).subUrl) {
                    await adapter
                        .sendMessage(
                            Number(customer.chatId),
                            `🔗 <b>لینک اشتراک:</b>\n<code>${(result.config as any).subUrl}</code>`
                        )
                        .catch(() => { });
                }

                // Direct config URI
                if (result.config?.configUrl) {
                    await adapter
                        .sendMessage(
                            Number(customer.chatId),
                            `🔐 <b>کانفیگ مستقیم:</b>\n<code>${result.config.configUrl}</code>`
                        )
                        .catch((e) => console.error("Failed to send config to customer:", e));
                }
            }
        } catch (error: any) {
            if (error.message === "Order_Already_Processed") {
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
            } else {
                console.error("Error approving order:", error);
                await adapter.sendMessage(ctx.chatId, `خطایی در تایید سفارش رخ داد:\n${error.message}`);
            }
        }
    }

    if (action === "REJECT") {
        try {
            const { count } = await prisma.order.updateMany({
                where: { id: orderId, status: "WAITING_APPROVAL" },
                data: { status: "REJECTED" },
            });

            if (count === 0) {
                await adapter.sendMessage(ctx.chatId, "این سفارش قبلاً تعیین تکلیف شده است.");
                return;
            }

            const label = order.type === "RENEWAL" ? "تمدید" : "سفارش";
            await adapter.sendMessage(ctx.chatId, `❌ ${label} #${orderId} رد شد`);
            await adapter
                .sendMessage(
                    Number(customer.chatId),
                    `❌ ${label} شما #${orderId} رد شد.\nدر صورت سوال با پشتیبانی در ارتباط باشید.`
                )
                .catch((e) => console.error("Failed to notify customer of rejection:", e));
        } catch (error: any) {
            console.error("Error rejecting order:", error);
            await adapter.sendMessage(ctx.chatId, "خطایی در رد سفارش رخ داد.");
        }
    }
};
