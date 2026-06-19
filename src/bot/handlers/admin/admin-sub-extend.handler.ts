import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { prisma } from "../../../config/prisma.js";
import { parseCallbackData } from "../../utils/callback-data.js";
import { userSteps } from "../../utils/state.js";
import { XuiService } from "../../../services/xui.service.js";

// ── Single subscription: ask ────────────────────────────────────────────

export const adminSubExtendAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: subscriptionId } = parseCallbackData(ctx.callbackData ?? "");
    if (!subscriptionId) return adapter.sendMessage(ctx.chatId, "شناسه اشتراک نامعتبر است.");

    userSteps.set(String(ctx.chatId), `ADMIN_AWAITING_SUB_EXTEND:${subscriptionId}`);

    await adapter.sendMessage(
        ctx.chatId,
        `➕ <b>افزودن روز/حجم</b>\n\nمقادیر را در دو خط ارسال کنید (برای رد کردن هرکدام 0 بزنید):\n\n<code>تعداد روز\nحجم به گیگابایت</code>\n\nمثال:\n<code>15\n5</code>`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 انصراف", callback_data: `ADMIN_USER_DETAIL_FROM_SUB:${subscriptionId}` }]] } }
    );
};

// ── Single subscription: confirm ────────────────────────────────────────

export const adminSubExtendConfirmHandler = async (
    ctx: BotContext,
    adapter: BotAdapter,
    subscriptionId: number
) => {
    if (!(await requireAdmin(ctx, adapter))) return;
    userSteps.delete(String(ctx.chatId));

    const lines = (ctx.text ?? "").trim().split("\n").map((l) => l.trim());
    const days = parseInt(lines[0] ?? "0") || 0;
    const gb = parseFloat(lines[1] ?? "0") || 0;

    if (days <= 0 && gb <= 0) {
        return adapter.sendMessage(ctx.chatId, "❌ حداقل یکی از مقادیر باید بزرگتر از صفر باشد.");
    }

    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, config: true },
    });
    if (!subscription) return adapter.sendMessage(ctx.chatId, "اشتراک پیدا نشد.");

    if (!subscription.config?.clientEmail) {
        return adapter.sendMessage(ctx.chatId, "❌ این اشتراک کانفیگ معتبری روی پنل ندارد.");
    }

    // addBytes uses the same binary GiB conversion as config.service.ts,
    // so it matches what's actually shown in the client app.
    const addBytes = Math.round(gb * 1024 ** 3);

    // Panel first — if this fails, we don't touch the DB, so the two stay in sync.
    let result;
    try {
        result = await XuiService.bulkAdjustClients(
            [subscription.config.clientEmail],
            days,
            addBytes
        );
    } catch (err) {
        console.error("Failed to adjust client on panel:", err);
        return adapter.sendMessage(ctx.chatId, "❌ بروزرسانی روی پنل ناموفق بود. هیچ تغییری اعمال نشد.");
    }

    const skip = result.skipped.find((s) => s.email === subscription.config!.clientEmail);
    if (skip) {
        return adapter.sendMessage(
            ctx.chatId,
            `⚠️ پنل این تغییر را رد کرد: ${skip.reason}\nدیتابیس بروزرسانی نشد.`
        );
    }

    const newExpireAt = new Date(subscription.expireAt);
    if (days !== 0) newExpireAt.setDate(newExpireAt.getDate() + days);

    const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
            expireAt: newExpireAt,
            trafficLimit: { increment: Math.round(gb * 1000) }, // MB, matches existing storage convention
        },
    });

    await adapter.sendMessage(
        ctx.chatId,
        `✅ اشتراک #${subscriptionId} بروزرسانی شد.\n` +
        `📅 انقضای جدید: ${updated.expireAt.toLocaleDateString("fa-IR")}\n` +
        `📶 حجم جدید: ${updated.trafficLimit / 1000} گیگابایت`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: `ADMIN_USER_DETAIL:${subscription.userId}` }]] } }
    );

    await adapter
        .sendMessage(
            Number(subscription.user.chatId),
            `🎁 اشتراک شما توسط مدیریت بروزرسانی شد.\n` +
            (days > 0 ? `➕ ${days} روز اضافه شد.\n` : "") +
            (gb > 0 ? `➕ ${gb} گیگابایت اضافه شد.\n` : "")
        )
        .catch(() => { });
};

// ── Bulk: ask for target users ──────────────────────────────────────────

export const adminBulkExtendAskTargetsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_BULK_TARGETS");

    await adapter.sendMessage(
        ctx.chatId,
        `📦 <b>افزودن گروهی روز/حجم</b>\n\n` +
        `چت‌آیدی کاربران را هرکدام در یک خط ارسال کنید، یا کلمه <code>ALL</code> برای همه کاربران دارای اشتراک فعال:`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 انصراف", callback_data: "ADMIN_MENU" }]] } }
    );
};

// ── Bulk: targets received, ask for amounts ─────────────────────────────

export const adminBulkExtendTargetsReceivedHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const raw = (ctx.text ?? "").trim();
    if (!raw) return adapter.sendMessage(ctx.chatId, "ورودی خالی است.");

    // Store the raw target list in-memory keyed by admin chatId so we don't
    // need to cram an unbounded list into the userSteps string value.
    bulkExtendTargets.set(String(ctx.chatId), raw);
    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_BULK_AMOUNT");

    await adapter.sendMessage(
        ctx.chatId,
        `مقادیر را در دو خط ارسال کنید (0 برای رد کردن):\n\n<code>تعداد روز\nحجم به گیگابایت</code>`
    );
};

// ── Bulk: apply ──────────────────────────────────────────────────────────

export const adminBulkExtendApplyHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;
    userSteps.delete(String(ctx.chatId));

    const raw = bulkExtendTargets.get(String(ctx.chatId));
    bulkExtendTargets.delete(String(ctx.chatId));
    if (!raw) return adapter.sendMessage(ctx.chatId, "❌ لیست کاربران یافت نشد، دوباره تلاش کنید.");

    const lines = (ctx.text ?? "").trim().split("\n").map((l) => l.trim());
    const days = parseInt(lines[0] ?? "0") || 0;
    const gb = parseFloat(lines[1] ?? "0") || 0;

    if (days <= 0 && gb <= 0) {
        return adapter.sendMessage(ctx.chatId, "❌ حداقل یکی از مقادیر باید بزرگتر از صفر باشد.");
    }

    const isAll = raw.trim().toUpperCase() === "ALL";
    const chatIds = isAll ? null : raw.split("\n").map((l) => l.trim()).filter(Boolean);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            status: "ACTIVE",
            deletedAt: null,
            config: { clientEmail: { not: null } },
            ...(isAll ? {} : { user: { chatId: { in: chatIds! } } }),
        },
        include: { user: true, config: true },
    });

    if (!subscriptions.length) {
        return adapter.sendMessage(ctx.chatId, "هیچ اشتراک فعال مطابقی با کانفیگ معتبر پیدا نشد.");
    }

    await adapter.sendMessage(ctx.chatId, `⏳ در حال اعمال روی ${subscriptions.length} اشتراک...`);

    const addBytes = Math.round(gb * 1024 ** 3);
    const emails = subscriptions.map((s) => s.config!.clientEmail!);

    // ── ONE call to the panel for the whole batch ───────────────────────────
    let result;
    try {
        result = await XuiService.bulkAdjustClients(emails, days, addBytes);
    } catch (err) {
        console.error("Bulk adjust panel call failed entirely:", err);
        return adapter.sendMessage(
            ctx.chatId,
            "❌ درخواست گروهی روی پنل کاملاً ناموفق بود. هیچ تغییری اعمال نشد."
        );
    }

    const skippedEmails = new Set(result.skipped.map((s) => s.email));

    let success = 0;
    let skipped = 0;

    for (const sub of subscriptions) {
        const email = sub.config!.clientEmail!;

        // Only write to DB for clients the panel actually adjusted —
        // skipped ones (e.g. unlimited clients) must NOT drift from panel state.
        if (skippedEmails.has(email)) {
            skipped++;
            continue;
        }

        try {
            const newExpireAt = new Date(sub.expireAt);
            if (days !== 0) newExpireAt.setDate(newExpireAt.getDate() + days);

            await prisma.subscription.update({
                where: { id: sub.id },
                data: {
                    expireAt: newExpireAt,
                    trafficLimit: { increment: Math.round(gb * 1000) },
                },
            });

            await adapter
                .sendMessage(
                    Number(sub.user.chatId),
                    `🎁 اشتراک شما توسط مدیریت بروزرسانی شد.\n` +
                    (days > 0 ? `➕ ${days} روز اضافه شد.\n` : "") +
                    (gb > 0 ? `➕ ${gb} گیگابایت اضافه شد.\n` : "")
                )
                .catch(() => { });

            success++;
        } catch (err) {
            console.error(`Bulk extend DB update failed for subscription ${sub.id}:`, err);
        }
        await new Promise((r) => setTimeout(r, 30)); // pace the Telegram notifications only
    }

    const skipDetail = result.skipped.length > 0
        ? `\n⚠️ رد شده توسط پنل: ${result.skipped.length}\n` +
        result.skipped.slice(0, 5).map((s) => `   • ${s.email}: ${s.reason}`).join("\n") +
        (result.skipped.length > 5 ? `\n   …و ${result.skipped.length - 5} مورد دیگر` : "")
        : "";

    await adapter.sendMessage(
        ctx.chatId,
        `✅ عملیات گروهی تمام شد.\n\n✅ موفق: ${success}${skipDetail}`,
        { reply_markup: { inline_keyboard: [[{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]] } }
    );
};

// In-memory store for bulk target lists, keyed by admin chatId.
// Cleared on use; not persisted (acceptable — admin re-sends if process restarts).
const bulkExtendTargets = new Map<string, string>();