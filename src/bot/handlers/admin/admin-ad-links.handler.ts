import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdLinkService } from "../../../services/ad-link.service.js";
import { userSteps } from "../../utils/state.js";

const BOT_USERNAME = process.env.BOT_USERNAME || "lexi_vpnbot";

// Step 1 — ask for a label
export const adminAdLinkCreateAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_AD_LINK_LABEL");

    await adapter.sendMessage(
        ctx.chatId,
        `🔗 <b>ساخت لینک تبلیغاتی جدید</b>\n\nیک عنوان برای این لینک وارد کنید (مثلاً: اینستاگرام، کانال X، تبلیغ‌کننده Y):`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 انصراف", callback_data: "ADMIN_AD_LINKS" }]] } }
    );
};

// Step 2 — create + return the shareable link
export const adminAdLinkCreateConfirmHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;
    userSteps.delete(String(ctx.chatId));

    const label = ctx.text?.trim();
    if (!label) return adapter.sendMessage(ctx.chatId, "عنوان نمی‌تواند خالی باشد.");

    const link = await AdLinkService.createLink(label);
    const url = `https://t.me/${BOT_USERNAME}?start=${link.code}`;

    await adapter.sendMessage(
        ctx.chatId,
        `✅ لینک ساخته شد.\n\n🏷 عنوان: ${label}\n🔗 لینک:\n<code>${url}</code>`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 لیست لینک‌ها", callback_data: "ADMIN_AD_LINKS" }]] } }
    );
};

// List with live join counts
export const adminAdLinkListHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const links = await AdLinkService.getAllWithCounts();

    if (!links.length) {
        return adapter.sendMessage(ctx.chatId, "هیچ لینک تبلیغاتی ساخته نشده.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ ساخت لینک جدید", callback_data: "ADMIN_AD_LINK_CREATE" }],
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        });
    }

    const text = links
        .map(
            (l) =>
                `🔗 <b>${l.label || "بدون عنوان"}</b>\n` +
                `   👥 عضو شده از این لینک: <b>${l.joins}</b>\n` +
                `   <code>https://t.me/${BOT_USERNAME}?start=${l.code}</code>`
        )
        .join("\n\n");

    await adapter.sendMessage(ctx.chatId, `📊 <b>لینک‌های تبلیغاتی</b>\n\n${text}`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ ساخت لینک جدید", callback_data: "ADMIN_AD_LINK_CREATE" }],
                [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
            ],
        },
    });
};