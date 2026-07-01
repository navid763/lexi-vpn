import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { SettingsService } from "../../../services/settings.service.js";
import { userSteps } from "../../utils/state.js";

export const adminEditReferralRewardAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_REFERRAL_REWARD");

    const current = await SettingsService.getReferralReward();

    await adapter.sendMessage(
        ctx.chatId,
        `💝 <b>ویرایش مبلغ پاداش دعوت (رفرال)</b>\n\n` +
        `مبلغ فعلی: <b>${(current / 10).toLocaleString()} تومان</b>\n\n` +
        `مبلغ جدید را به <b>تومان</b> وارد کنید:`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }]],
            },
        }
    );
};

export const adminEditReferralRewardConfirmHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const amountToman = parseInt((ctx.text ?? "").trim());
    if (isNaN(amountToman) || amountToman < 0) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ مبلغ نامعتبر است. لطفاً یک عدد معتبر (تومان) وارد کنید.",
            {
                reply_markup: {
                    inline_keyboard: [[{ text: "تلاش مجدد", callback_data: "ADMIN_EDIT_REFERRAL_REWARD" }]],
                },
            }
        );
    }

    const amountRial = amountToman * 10;
    await SettingsService.setReferralReward(amountRial);

    await adapter.sendMessage(
        ctx.chatId,
        `✅ مبلغ پاداش دعوت به <b>${amountToman.toLocaleString()} تومان</b> بروزرسانی شد.`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]],
            },
        }
    );
};