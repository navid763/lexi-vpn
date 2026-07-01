import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { TestTrialService } from "../../services/test-trial.service.js";
import { SettingsService } from "../../services/settings.service.js";

function formatRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return days > 0 ? `${days} روز و ${remHours} ساعت` : `${remHours} ساعت`;
}

export const testConfigHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    try {
        if (await SettingsService.isMaintenanceMode()) {
            return adapter.sendMessage(ctx.chatId, "🛠 ربات موقتاً در حال بروزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.");
        }

        const user = await prisma.user.findUnique({
            where: { chatId: String(ctx.chatId) },
        });
        if (!user) {
            return adapter.sendMessage(ctx.chatId, "مشکلی پیش آمد. لطفاً /start را بزنید.");
        }

        const eligibility = await TestTrialService.getEligibility(user.id);

        if (!eligibility.eligible) {
            const remaining = eligibility.nextEligibleAt.getTime() - Date.now();
            return adapter.sendMessage(
                ctx.chatId,
                `⚠️ شما قبلاً از کانفیگ تست استفاده کرده‌اید.\n\n` +
                `هر کاربر فقط یکبار در ماه می‌تواند کانفیگ تست دریافت کند.\n` +
                `⏳ زمان باقی‌مانده تا دریافت مجدد: ${formatRemaining(remaining)}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📦 مشاهده پلن‌ها", callback_data: "PLANS" }],
                            [{ text: "🏠 خانه", callback_data: "HOME" }],
                        ],
                    },
                }
            );
        }

        await adapter.sendMessage(ctx.chatId, "⏳ در حال ساخت کانفیگ تست...");

        const trial = await TestTrialService.createTrial(user.id);

        await adapter.sendMessage(
            ctx.chatId,
            `✅ <b>کانفیگ تست شما آماده شد!</b>\n\n` +
            `📶 حجم: <b>100 مگابایت</b>\n` +
            `⏳ اعتبار: <b>5 ساعت</b>\n\n` +
            `پس از اتمام حجم یا زمان، کانفیگ به‌طور خودکار غیرفعال می‌شود.`
        );

        if (trial.subUrl) {
            await adapter.sendMessage(ctx.chatId, `🔗 <b>لینک اشتراک:</b>\n<code>${trial.subUrl}</code>`);
        }

        await adapter.sendMessage(
            ctx.chatId,
            `🔐 <b>کانفیگ مستقیم:</b>\n<code>${trial.configUrl}</code>`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📦 مشاهده پلن‌ها", callback_data: "PLANS" }],
                        [{ text: "🏠 خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );
    } catch (error) {
        console.error("error during testConfigHandler:", error);
        await adapter.sendMessage(
            ctx.chatId,
            "❌ متاسفانه در ساخت کانفیگ تست مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید."
        );
    }
};