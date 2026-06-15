import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdminPanelService } from "../../../services/admin-panel.service.js";

export const adminStatsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const stats = await AdminPanelService.getStats();

    await adapter.sendMessage(
        ctx.chatId,
        `📊 <b>آمار کلی سیستم</b>\n\n` +
        `👥 کل کاربران: <b>${stats.totalUsers}</b>\n` +
        `✅ اشتراک فعال: <b>${stats.activeSubscriptions}</b>\n` +
        `⏳ سفارش در انتظار تایید: <b>${stats.pendingOrders}</b>\n` +
        `💰 شارژ کیف پول در انتظار: <b>${stats.pendingTopups}</b>\n` +
        `💵 درآمد امروز: <b>${stats.todayRevenueToman.toLocaleString("fa-IR")} تومان</b>`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );
};
