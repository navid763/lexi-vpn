import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { AdminPanelService } from "../../../services/admin-panel.service.js";
import { parseCallbackData } from "../../utils/callback-data.js";
import { userSteps } from "../../utils/state.js";
import { getRemainingTime } from "../../../utils/date-time.js";

// View user profile
export const adminUserDetailHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: userId } = parseCallbackData(ctx.callbackData ?? "");
    if (!userId) return adapter.sendMessage(ctx.chatId, "شناسه کاربر نامعتبر است.");

    const user = await AdminPanelService.getUserDetail(userId);
    if (!user) return adapter.sendMessage(ctx.chatId, "کاربر پیدا نشد.");

    const subLines = user.subscriptions.length
        ? user.subscriptions.map((s, i) =>
            `  ${i + 1}. ${s.trafficLimit / 1000}GB — ${s.status === "ACTIVE" ? "✅" : "❌"} — باقی‌مانده: ${getRemainingTime(s.expireAt)}`
        ).join("\n")
        : "  ندارد";

    const orderLines = user.orders.length
        ? user.orders.map((o) =>
            `  #${o.id} — ${o.status} — ${(o.price / 10).toLocaleString()} تومان`
        ).join("\n")
        : "  ندارد";

    const text =
        `👤 <b>اطلاعات کاربر</b>\n\n` +
        `🆔 چت‌آیدی: <code>${user.chatId}</code>\n` +
        `👤 نام: ${user.fullName || "—"}\n` +
        `🔖 یوزرنیم: ${user.username ? "@" + user.username : "—"}\n` +
        `💰 موجودی کیف پول: <b>${(user.balance / 10).toLocaleString()} تومان</b>\n` +
        `📅 عضویت: ${user.createdAt.toLocaleDateString("fa-IR")}\n\n` +
        `📦 <b>اشتراک‌های اخیر:</b>\n${subLines}\n\n` +
        `🧾 <b>سفارش‌های اخیر:</b>\n${orderLines}`;

    await adapter.sendMessage(ctx.chatId, text, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "💳 شارژ دستی کیف پول", callback_data: `ADMIN_MANUAL_TOPUP:${user.id}` },
                ],
                [
                    { text: "🔍 جستجوی مجدد", callback_data: "ADMIN_SEARCH_USER" },
                    { text: "🔙 منو", callback_data: "ADMIN_MENU" },
                ],
            ],
        },
    });
};

// Step 1 — admin taps "Manual topup" → ask for amount
export const adminManualTopupAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: userId } = parseCallbackData(ctx.callbackData ?? "");
    if (!userId) return adapter.sendMessage(ctx.chatId, "شناسه کاربر نامعتبر است.");

    // Store the target userId in state so the next message handler knows who to credit
    userSteps.set(String(ctx.chatId), `ADMIN_AWAITING_TOPUP_AMOUNT:${userId}`);

    await adapter.sendMessage(
        ctx.chatId,
        `💳 مبلغ شارژ دستی را به <b>تومان</b> وارد کنید:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: `ADMIN_USER_DETAIL:${userId}` }],
                ],
            },
        }
    );
};

// Step 2 — admin types amount → credit wallet
export const adminManualTopupConfirmHandler = async (
    ctx: BotContext,
    adapter: BotAdapter,
    targetUserId: number
) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const amount = parseInt(ctx.text ?? "0");
    if (isNaN(amount) || amount < 1000) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ مبلغ نامعتبر است. حداقل 1,000 تومان وارد کنید."
        );
    }

    const { user } = await AdminPanelService.manualTopup(
        targetUserId,
        amount,
        String(ctx.chatId)
    );

    // Notify admin
    await adapter.sendMessage(
        ctx.chatId,
        `✅ کیف پول کاربر <code>${user.chatId}</code> به مبلغ <b>${amount.toLocaleString()} تومان</b> شارژ شد.\nموجودی جدید: <b>${(user.balance / 10).toLocaleString()} تومان</b>`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        }
    );

    // Notify the user
    await adapter
        .sendMessage(
            Number(user.chatId),
            `✅ کیف پول شما توسط مدیریت به مبلغ <b>${amount.toLocaleString()} تومان</b> شارژ شد.\nموجودی فعلی: <b>${(user.balance / 10).toLocaleString()} تومان</b>`
        )
        .catch((e) => console.error("Failed to notify user of manual topup:", e));
};
