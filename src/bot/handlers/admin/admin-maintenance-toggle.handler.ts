import { SettingsService } from "../../../services/settings.service.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { BotAdapter } from "../../adapters/bot.adapter.js";
import { BotContext } from "../../types/bot.context.js";

export const adminMaintenanceToggleHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const current = await SettingsService.isMaintenanceMode();
    await SettingsService.setMaintenanceMode(!current);

    await adapter.sendMessage(
        ctx.chatId,
        !current ? "🛠 حالت تعمیر فعال شد. کاربران امکان خرید/شارژ ندارند." : "✅ حالت تعمیر غیرفعال شد.",
        { reply_markup: { inline_keyboard: [[{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]] } }
    );
};