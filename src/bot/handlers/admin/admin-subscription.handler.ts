import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { prisma } from "../../../config/prisma.js";
import { parseCallbackData } from "../../utils/callback-data.js";
import { XuiService } from "../../../services/xui.service.js";

export const adminSubCancelAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");

    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true },
    });
    if (!subscription) return adapter.sendMessage(ctx.chatId, "اشتراک پیدا نشد.");

    await adapter.sendMessage(
        ctx.chatId,
        `⚠️ آیا از لغو اشتراک کاربر <code>${subscription.user.chatId}</code> مطمئن هستید؟\n\nاین کار دسترسی VPN را فوراً قطع می‌کند.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ بله، لغو شود", callback_data: `ADMIN_SUB_CANCEL_CONFIRM:${subscriptionId}` }],
                    [{ text: "❌ انصراف", callback_data: `ADMIN_USER_DETAIL:${subscription.userId}` }],
                ],
            },
        }
    );
};

export const adminSubCancelConfirmHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");

    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, config: true },
    });

    if (!subscription || subscription.status !== "ACTIVE") {
        return adapter.sendMessage(ctx.chatId, "⚠️ این اشتراک فعال نیست یا قبلاً لغو شده است.");
    }

    // Cut off the panel FIRST. If this throws, we deliberately don't mark it
    // cancelled in the DB — better to retry than have a "cancelled" sub that's
    // still live on the VPN side.
    if (subscription.config?.clientEmail) {
        await XuiService.disableClient(subscription.config.uuid, subscription.config.clientEmail);
    }

    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "CANCELLED", deletedAt: new Date() },
    });

    await adapter.sendMessage(
        ctx.chatId,
        `✅ اشتراک کاربر <code>${subscription.user.chatId}</code> لغو و دسترسی VPN قطع شد.`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: `ADMIN_USER_DETAIL:${subscription.userId}` }]] } }
    );

    await adapter
        .sendMessage(Number(subscription.user.chatId), `⚠️ اشتراک شما توسط مدیریت لغو شد.\nدر صورت سوال با پشتیبانی در ارتباط باشید.`)
        .catch((e) => console.error("Failed to notify user of cancellation:", e));
};