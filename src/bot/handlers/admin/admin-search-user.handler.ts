import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdminPanelService } from "../../../services/admin-panel.service.js";
import { userSteps } from "../../utils/state.js";

// Step 1 — admin taps "Search User" → bot asks for input
export const adminSearchUserHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_USER_SEARCH");

    await adapter.sendMessage(
        ctx.chatId,
        `🔍 <b>جستجوی کاربر</b>\n\nچت‌آیدی عددی یا @یوزرنیم کاربر را وارد کنید:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );
};

// Step 2 — admin types the query → show matching users
export const adminUserSearchResultsHandler = async (
    ctx: BotContext,
    adapter: BotAdapter
) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const query = ctx.text?.trim() ?? "";
    if (!query) {
        return adapter.sendMessage(ctx.chatId, "عبارت جستجو خالی است.");
    }

    const users = await AdminPanelService.findUsers(query);

    if (!users.length) {
        return adapter.sendMessage(
            ctx.chatId,
            `کاربری با "${query}" پیدا نشد.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔍 جستجوی مجدد", callback_data: "ADMIN_SEARCH_USER" }],
                        [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                    ],
                },
            }
        );
    }

    const keyboard = users.map((u) => [
        {
            text: `${u.fullName || u.username || u.chatId} — ID: ${u.chatId}`,
            callback_data: `ADMIN_USER_DETAIL:${u.id}`,
        },
    ]);

    keyboard.push([{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]);

    await adapter.sendMessage(
        ctx.chatId,
        `${users.length} کاربر یافت شد:`,
        { reply_markup: { inline_keyboard: keyboard } }
    );
};
