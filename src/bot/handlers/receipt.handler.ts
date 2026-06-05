import { prisma } from "../../config/prisma.ts";
import { PaymentService } from "../../services/payment.service.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";

const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

export async function receiptHandler(ctx: BotContext, adapter: BotAdapter) {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) {
        console.log("user not found");
        return;
    }

    // Find a pending_payment order created in the last 10 minutes.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const order = await prisma.order.findFirst({
        where: {
            userId: user.id,
            status: "PENDING_PAYMENT",
            createdAt: { gte: tenMinutesAgo },
            deletedAt: null,
        },
    });

    if (!order) {
        return adapter.sendMessage(
            ctx.chatId,
            "شما فعلاً سفارشی برای پرداخت ندارید یا زمان پرداخت تمام شده است. لطفا از ابتدا /start کنید."
        );
    }

    // Guard against duplicate receipt submissions for the same order.
    const existingPayment = await prisma.payment.findFirst({
        where: {
            orderId: order.id,
            status: { in: ["PENDING", "APPROVED"] },
        },
    });

    if (existingPayment) {
        return adapter.sendMessage(
            ctx.chatId,
            "⚠️ رسید شما قبلاً دریافت شده و در حال بررسی است. لطفاً منتظر بمانید."
        );
    }

    await PaymentService.submitCardPayment(
        user.id,
        order.id,
        1, // placeholder amount; real amount is on the order
        ctx.photo
    );

    await adapter.sendMessage(
        ctx.chatId,
        "✅ رسید دریافت شد.\n\nپس از بررسی، سرویس فعال میشود و برایتان ارسال می‌گردد."
    );

    if (!ADMIN_CHAT_ID) {
        console.error("ADMIN_CHAT_ID is not set");
        return;
    }

    if (ctx.photo) {
        await adapter.sendPhoto(
            ADMIN_CHAT_ID,
            ctx.photo,
            `سفارش جدید\nشماره سفارش: ${order.id}\n\nمبلغ سفارش: ${order.price}\nکاربر: ${ctx.chatId}\nتایید؟`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ تایید", callback_data: `APPROVE:${order.id}` },
                            { text: "❌ رد", callback_data: `REJECT:${order.id}` },
                        ],
                    ],
                },
            }
        );
    }
}