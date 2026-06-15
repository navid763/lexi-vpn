import cron from "node-cron";
import { prisma } from "../../config/prisma.js";
import { TelegramAdapter } from "../../bot/adapters/telegram.adapter.js";

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const adapter = new TelegramAdapter(botToken);

cron.schedule("0 * * * *", async () => {
    console.log("Running hourly subscription check...");

    try {
        // Include the related user so we can read chatId without a second query.
        const activeSubs = await prisma.subscription.findMany({
            where: { status: "ACTIVE", deletedAt: null },
            include: { user: true },
        });

        const now = new Date();

        for (const sub of activeSubs) {
            const diffMs = new Date(sub.expireAt).getTime() - now.getTime();
            const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
            const chatId = sub.user.chatId;

            if (hoursRemaining <= 0) {
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: { status: "EXPIRED" },
                });

                await adapter.sendMessage(
                    Number(chatId),
                    `❌ کاربر گرامی، اشتراک شما منقضی شد و سرویس قطع گردید.\nبرای تمدید از منوی ربات اقدام کنید.`
                );
                console.log(`Subscription ${sub.id} expired.`);
            } else if (hoursRemaining === 48) {
                await adapter.sendMessage(
                    Number(chatId),
                    `⚠️ کاربر گرامی، تنها <b>2 روز</b> تا پایان اشتراک شما باقیمانده است.`
                );
            } else if (hoursRemaining === 168) {
                await adapter.sendMessage(
                    Number(chatId),
                    `ℹ️ کاربر گرامی، <b>7 روز</b> تا پایان اشتراک شما زمان باقیمانده است.`
                );
            }
        }
    } catch (error) {
        console.error("Error in hourly subscription cron job:", error);
    }
});
