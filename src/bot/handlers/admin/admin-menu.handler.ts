import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { userSteps } from "../../utils/state.js";

export const adminMenuHandler = async (ctx: BotContext, adapter: BotAdapter) => {
  if (!(await requireAdmin(ctx, adapter))) return;

  // Clear any in-progress state the admin might be in
  userSteps.delete(String(ctx.chatId));

  await adapter.sendMessage(
    ctx.chatId,
    `🛠 <b>پنل مدیریت</b>\n\nیک بخش را انتخاب کنید:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 آمار کلی", callback_data: "ADMIN_STATS" }],
          [
            { text: "🔍 جستجوی کاربر", callback_data: "ADMIN_SEARCH_USER" },
            { text: "📦 جستجوی سفارش", callback_data: "ADMIN_SEARCH_ORDER" }
          ],
          [{ text: "🛍 مدیریت پلن‌ها", callback_data: "ADMIN_PRODUCTS" }],
          [
            { text: "💳 ویرایش اطلاعات کارت", callback_data: "ADMIN_EDIT_CARD" },
            { text: "💝 ویرایش مبلغ پاداش دعوت", callback_data: "ADMIN_EDIT_REFERRAL_REWARD" }
          ],
          [{ text: "📦 افزودن گروهی روز/حجم", callback_data: "ADMIN_BULK_EXTEND" }],
          [{ text: "🔗 لینک‌های تبلیغاتی", callback_data: "ADMIN_AD_LINKS" }],
          [{ text: "📢 ارسال پیام همگانی", callback_data: "ADMIN_BROADCAST" }],
          [{ text: "🛠 حالت تعمیر (روشن/خاموش)", callback_data: "ADMIN_MAINTENANCE_TOGGLE" }]
        ],
      },
    }
  );
};
