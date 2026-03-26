import cron from "node-cron";
import { Subscription, User } from "../../models/index.ts";
import { BaleAdapter } from '../../bot/adapters/bale.adapter.ts';

const botToken = process.env.BALE_BOT_TOKEN || '';
const adapter = new BaleAdapter(botToken);

cron.schedule('0 * * * *', async () => {
    console.log("Running hourly subscription check...");

    try {
        const activeSubs = await Subscription.findAll({
            where: { status: "active" },
            include: [{ model: User, as: "user" }]
        });

        const now = new Date();

        for (const sub of activeSubs) {
            const expireDate = new Date(sub.toJSON().expire_at);
            const diffTime = expireDate.getTime() - now.getTime();
            const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

            const chatId = (sub as any).toJSON().user.chat_id;

            if (hoursRemaining <= 0) {
                await sub.update({ status: "expired" });

                await adapter.sendMessage(
                    chatId,
                    `❌ کاربر گرامی، اشتراک شما منقضی شد و سرویس قطع گردید.\nبرای تمدید از منوی ربات اقدام کنید.`
                );
                console.log(`Subscription ${sub.id} expired.`);
            } else if (hoursRemaining === 48) {

                await adapter.sendMessage(
                    chatId,
                    `⚠️ کاربر گرامی، تنها **2 روز** تا پایان اشتراک شما باقیمانده است. برای جلوگیری از قطع ارتباط، لطفاً نسبت به تمدید سرویس اقدام کنید.`
                );

            } else if (hoursRemaining === 168) {

                await adapter.sendMessage(
                    chatId,
                    `ℹ️ کاربر گرامی، **7 روز** تا پایان اشتراک شما زمان باقیمانده است.`
                );
            }

        }

    } catch (error) {
        console.error("Error in hourly subscription cron job:", error);
    }

})