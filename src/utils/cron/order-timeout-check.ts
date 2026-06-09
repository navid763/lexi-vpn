import cron from "node-cron";
import { prisma } from "../../config/prisma.ts";
import { TelegramAdapter } from "../../bot/adapters/telegram.adapter.ts";

const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
const adapter = new TelegramAdapter(botToken);

cron.schedule("* * * * *", async () => {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const cancelledOrders = await prisma.$transaction(async (tx) => {
            // سفارش‌های منقضی‌ شده که هنوز حذف نرم نشده‌اند.
            const expirableOrders = await tx.order.findMany({
                where: {
                    status: "PENDING_PAYMENT",
                    createdAt: { lt: tenMinutesAgo },
                    deletedAt: null,
                },
                include: {
                    user: true,
                },
            });

            if (!expirableOrders.length) {
                return [];
            }

            const expirableIds = expirableOrders.map((order) => order.id);

            // لغو گروهی با در نظر گرفتن وضعیت فعلی و عدم حذف نرم
            await tx.order.updateMany({
                where: {
                    id: { in: expirableIds },
                    status: { in: ["PENDING_PAYMENT", "WAITING_APPROVAL"] },
                    deletedAt: null,
                },
                data: {
                    status: "CANCELLED",
                },
            });

            // فقط سفارش‌هایی را برای ارسال پیام برمی‌گردانیم که واقعا لغو شده‌اند.
            return tx.order.findMany({
                where: {
                    id: { in: expirableIds },
                    status: "CANCELLED",
                    deletedAt: null,
                },
                include: {
                    user: true,
                },
            });
        });

        if (!cancelledOrders.length) return;

        for (const order of cancelledOrders) {
            if (!order.user?.chatId) continue;

            try {
                await adapter.sendMessage(
                    Number(order.user.chatId),
                    `⚠️ سفارش شما با شناسه ${order.id} به دلیل عدم پرداخت/تأیید در زمان مقرر (10 دقیقه) لغو شد.`
                );
            } catch (msgError) {
                console.error(
                    `Failed to send cancellation message to user ${order.user.chatId}:`,
                    msgError
                );
            }
        }

        console.log(`Cancelled ${cancelledOrders.length} expired orders.`);
    } catch (error) {
        console.error("Error in order timeout cron job:", error);
    }
});
