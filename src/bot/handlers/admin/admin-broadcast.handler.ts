import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdminPanelService } from "../../../services/admin-panel.service.js";
import { userSteps } from "../../utils/state.js";

// Step 1 — admin taps Broadcast → ask for message text
export const adminBroadcastAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_BROADCAST");

    await adapter.sendMessage(
        ctx.chatId,
        `📢 <b>ارسال پیام همگانی</b>\n\nمتن پیامی که می‌خواهید به همه کاربران ارسال شود را بنویسید:\n\n<i>پیام از HTML پشتیبانی می‌کند. مثال: &lt;b&gt;متن بولد&lt;/b&gt;</i>`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );
};

// Step 2 — admin sends message text → broadcast to all users
export const adminBroadcastSendHandler = async (
    ctx: BotContext,
    adapter: BotAdapter
) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const text = ctx.text?.trim();
    if (!text) {
        return adapter.sendMessage(ctx.chatId, "متن پیام خالی است.");
    }

    const chatIds = await AdminPanelService.getAllUserChatIds();

    await adapter.sendMessage(
        ctx.chatId,
        `📤 در حال ارسال به ${chatIds.length} کاربر...`
    );

    let sent = 0;
    let failed = 0;

    for (const chatId of chatIds) {
        try {
            await adapter.sendMessage(Number(chatId), `📢 \n\n${text}`);
            sent++;
        } catch {
            failed++;
        }
        // Small delay to avoid Telegram rate limits (30 messages/sec max)
        await new Promise((r) => setTimeout(r, 50));
    }

    await adapter.sendMessage(
        ctx.chatId,
        `✅ ارسال پیام همگانی تمام شد.\n\n✅ موفق: ${sent}\n❌ ناموفق: ${failed}`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );
};
