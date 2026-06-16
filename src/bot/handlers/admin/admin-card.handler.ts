// src/bot/handlers/admin/admin-card.handler.ts
import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { SettingsService } from "../../../services/settings.service.js";
import { userSteps } from "../../utils/state.js";

export const adminEditCardAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_CARD_INFO");

    const current = await SettingsService.getCardInfo();

    await adapter.sendMessage(
        ctx.chatId,
        `💳 <b>ویرایش اطلاعات کارت</b>\n\n` +
        `شماره کارت فعلی: <code>${current.cardNumber}</code>\n` +
        `صاحب کارت فعلی: ${current.cardOwner}\n\n` +
        `اطلاعات جدید را در <b>دو خط</b> ارسال کنید:\n\n` +
        `<code>شماره کارت\nنام صاحب کارت</code>`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }]],
            },
        }
    );
};

export const adminEditCardConfirmHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const lines = (ctx.text ?? "").trim().split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ فرمت نادرست است. لطفاً دقیقاً ۲ خط ارسال کنید:\nشماره کارت\nنام صاحب کارت",
            {
                reply_markup: {
                    inline_keyboard: [[{ text: "تلاش مجدد", callback_data: "ADMIN_EDIT_CARD" }]],
                },
            }
        );
    }

    const [cardNumber, cardOwner] = lines;

    await SettingsService.set("CARD_NUMBER", cardNumber);
    await SettingsService.set("CARD_OWNER", cardOwner);

    await adapter.sendMessage(
        ctx.chatId,
        `✅ اطلاعات کارت بروزرسانی شد.\n\nشماره کارت: <code>${cardNumber}</code>\nصاحب کارت: ${cardOwner}`,
        {
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]],
            },
        }
    );
};