import { prisma } from "../../config/prisma.js";
import { PaymentService } from "../../services/payment.service.js";
import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";

const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID);

export async function receiptHandler(ctx: BotContext, adapter: BotAdapter) {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });
    if (!user) {
        console.log("user not found");
        return;
    }

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

    // Save payment to DB first — this must succeed before we send any messages.
    try {
        await PaymentService.submitCardPayment(
            user.id,
            order.id,
            order.price,
            ctx.photo
        );
    } catch (err: any) {
        if (err.message === "PAYMENT_ALREADY_EXISTS") {
            return adapter.sendMessage(
                ctx.chatId,
                "⚠️ رسید شما قبلاً دریافت شده و در حال بررسی است. لطفاً منتظر بمانید."
            );
        }
        throw err;
    }

    // FIX: send user confirmation and admin notification independently.
    // Previously, if sendMessage to the user threw (network error), the whole
    // function exited and the admin never received the photo — even though the
    // payment was already saved. Now each message is tried separately so a
    // failure in one does not block the other.

    await adapter
        .sendMessage(
            ctx.chatId,
            "✅ رسید دریافت شد.\n\nپس از بررسی، سرویس فعال میشود و برایتان ارسال می‌گردد."
        )
        .catch((err) =>
            console.error("[receiptHandler] Failed to send user confirmation:", err?.message ?? err)
        );

    if (!ADMIN_CHAT_ID) {
        console.error("ADMIN_CHAT_ID is not set");
        return;
    }

    if (ctx.photo) {
        await adapter
            .sendPhoto(
                ADMIN_CHAT_ID,
                ctx.photo,
                `سفارش جدید\nشماره سفارش: ${order.id}\n\nمبلغ سفارش: ${order.price / 10} تومان\nکاربر: ${ctx.chatId}\nتایید؟`,
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
            )
            .catch((err) =>
                console.error("[receiptHandler] Failed to notify admin:", err?.message ?? err)
            );
    }
}
