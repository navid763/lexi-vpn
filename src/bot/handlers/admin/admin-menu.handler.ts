import type { BotContext } from "../../types/bot.context.ts";
import type { BotAdapter } from "../../adapters/bot.adapter.ts";
import { requireAdmin } from "../../middlewares/admin.middleware.ts";
import { userSteps } from "../../utils/state.ts";

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
          [{ text: "🔍 جستجوی کاربر", callback_data: "ADMIN_SEARCH_USER" }],
          [{ text: "📦 جستجوی سفارش", callback_data: "ADMIN_SEARCH_ORDER" }],
          [{ text: "📢 ارسال پیام همگانی", callback_data: "ADMIN_BROADCAST" }],
        ],
      },
    }
  );
};