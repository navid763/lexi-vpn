import type { BotContext } from "../../types/bot.context.js";
import type { BotAdapter } from "../../adapters/bot.adapter.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { prisma } from "../../../config/prisma.js";
import { parseCallbackData } from "../../utils/callback-data.js";
import { userSteps } from "../../utils/state.js";

// ── Step flow for creating a product ─────────────────────────────────────────
//
//  ADMIN_PRODUCT_CREATE          → ask for details (one message)
//  ADMIN_AWAITING_PRODUCT_DATA   → parse, validate, create
//
// Format the admin must send:
//   نام پلن
//   حجم به گیگابایت
//   مدت به روز
//   قیمت به تومان
//
// Example:
//   پلن طلایی
//   30
//   30
//   150000

// ── List all products ─────────────────────────────────────────────────────────

export const adminProductListHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const products = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
    });

    if (!products.length) {
        return adapter.sendMessage(ctx.chatId, "هیچ پلنی وجود ندارد.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ افزودن پلن جدید", callback_data: "ADMIN_PRODUCT_CREATE" }],
                    [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
                ],
            },
        });
    }

    const keyboard = products.map((p) => [
        {
            text: `${p.isActive ? "🟢" : "🔴"} ${p.name} | ${p.trafficLimit / 1000}GB | ${p.durationDays}روز | ${(p.price / 10).toLocaleString()}ت`,
            callback_data: `ADMIN_PRODUCT_DETAIL:${p.id}`,
        },
    ]);

    keyboard.push([{ text: "➕ افزودن پلن جدید", callback_data: "ADMIN_PRODUCT_CREATE" }]);
    keyboard.push([{ text: "🔙 منو", callback_data: "ADMIN_MENU" }]);

    await adapter.sendMessage(
        ctx.chatId,
        `📦 <b>مدیریت پلن‌ها (${products.length} پلن)</b>\n\nیک پلن را برای مشاهده جزئیات انتخاب کنید:`,
        { reply_markup: { inline_keyboard: keyboard } }
    );
};

// ── Product detail ────────────────────────────────────────────────────────────

export const adminProductDetailHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: productId } = parseCallbackData(ctx.callbackData ?? "");
    if (!productId) return adapter.sendMessage(ctx.chatId, "شناسه پلن نامعتبر است.");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) {
        return adapter.sendMessage(ctx.chatId, "پلن پیدا نشد.");
    }

    const activeSubCount = await prisma.subscription.count({
        where: { order: { productId }, status: "ACTIVE", deletedAt: null },
    });

    const text =
        `📦 <b>جزئیات پلن</b>\n\n` +
        `🏷 نام: <b>${product.name}</b>\n` +
        `📶 حجم: <b>${product.trafficLimit / 1000} گیگابایت</b>\n` +
        `📅 مدت: <b>${product.durationDays} روز</b>\n` +
        `💰 قیمت: <b>${(product.price / 10).toLocaleString()} تومان</b>\n` +
        `وضعیت: ${product.isActive ? "🟢 فعال" : "🔴 غیرفعال"}\n` +
        `👥 اشتراک‌های فعال روی این پلن: <b>${activeSubCount}</b>\n` +
        `📅 ایجاد: ${product.createdAt.toLocaleDateString("fa-IR")}`;

    await adapter.sendMessage(ctx.chatId, text, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: product.isActive ? "🔴 غیرفعال کردن" : "🟢 فعال کردن",
                        callback_data: `ADMIN_PRODUCT_TOGGLE:${product.id}`,
                    },
                    {
                        text: "✏️ ویرایش قیمت",
                        callback_data: `ADMIN_PRODUCT_EDIT_PRICE:${product.id}`,
                    },
                ],
                [
                    {
                        text: "🗑 حذف پلن",
                        callback_data: `ADMIN_PRODUCT_DELETE:${product.id}`,
                    },
                ],
                [{ text: "🔙 لیست پلن‌ها", callback_data: "ADMIN_PRODUCTS" }],
            ],
        },
    });
};

// ── Toggle active/inactive ────────────────────────────────────────────────────

export const adminProductToggleHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: productId } = parseCallbackData(ctx.callbackData ?? "");
    if (!productId) return adapter.sendMessage(ctx.chatId, "شناسه پلن نامعتبر است.");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) {
        return adapter.sendMessage(ctx.chatId, "پلن پیدا نشد.");
    }

    const updated = await prisma.product.update({
        where: { id: productId },
        data: { isActive: !product.isActive },
    });

    await adapter.sendMessage(
        ctx.chatId,
        `${updated.isActive ? "🟢 پلن فعال شد." : "🔴 پلن غیرفعال شد."}\n\nکاربران این پلن را دیگر ${updated.isActive ? "می‌بینند" : "نمی‌بینند"}.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به پلن", callback_data: `ADMIN_PRODUCT_DETAIL:${productId}` }],
                ],
            },
        }
    );
};

// ── Soft-delete ───────────────────────────────────────────────────────────────

export const adminProductDeleteHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: productId } = parseCallbackData(ctx.callbackData ?? "");
    if (!productId) return adapter.sendMessage(ctx.chatId, "شناسه پلن نامعتبر است.");

    const activeSubCount = await prisma.subscription.count({
        where: { order: { productId }, status: "ACTIVE", deletedAt: null },
    });

    if (activeSubCount > 0) {
        return adapter.sendMessage(
            ctx.chatId,
            `⚠️ این پلن ${activeSubCount} اشتراک فعال دارد و قابل حذف نیست.\n\nابتدا آن را غیرفعال کنید تا کاربران جدید نتوانند آن را انتخاب کنند.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔴 غیرفعال کردن", callback_data: `ADMIN_PRODUCT_TOGGLE:${productId}` }],
                        [{ text: "🔙 بازگشت", callback_data: `ADMIN_PRODUCT_DETAIL:${productId}` }],
                    ],
                },
            }
        );
    }

    await prisma.product.update({
        where: { id: productId },
        data: { deletedAt: new Date(), isActive: false },
    });

    await adapter.sendMessage(ctx.chatId, "🗑 پلن با موفقیت حذف شد.", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📦 لیست پلن‌ها", callback_data: "ADMIN_PRODUCTS" }],
                [{ text: "🔙 منو", callback_data: "ADMIN_MENU" }],
            ],
        },
    });
};

// ── Create: step 1 — ask for data ─────────────────────────────────────────────

export const adminProductCreateAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.set(String(ctx.chatId), "ADMIN_AWAITING_PRODUCT_DATA");

    await adapter.sendMessage(
        ctx.chatId,
        `➕ <b>افزودن پلن جدید</b>\n\n` +
        `اطلاعات پلن را <b>در چهار خط جداگانه</b> ارسال کنید:\n\n` +
        `<code>نام پلن\nحجم (گیگابایت)\nمدت (روز)\nقیمت (تومان)</code>\n\n` +
        `مثال:\n<code>پلن طلایی\n30\n30\n150000</code>`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: "ADMIN_PRODUCTS" }],
                ],
            },
        }
    );
};

// ── Create: step 2 — parse and save ──────────────────────────────────────────

export const adminProductCreateConfirmHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const lines = (ctx.text ?? "").trim().split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length < 4) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ فرمت نادرست است. لطفاً دقیقاً ۴ خط ارسال کنید:\nنام\nحجم\nمدت\nقیمت",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "تلاش مجدد", callback_data: "ADMIN_PRODUCT_CREATE" }],
                    ],
                },
            }
        );
    }

    const [name, gbRaw, daysRaw, priceRaw] = lines;
    const gb = parseFloat(gbRaw);
    const days = parseInt(daysRaw);
    const priceToman = parseInt(priceRaw);

    if (!name || isNaN(gb) || gb <= 0 || isNaN(days) || days <= 0 || isNaN(priceToman) || priceToman <= 0) {
        return adapter.sendMessage(
            ctx.chatId,
            "❌ مقادیر وارد شده نامعتبر است. حجم، مدت و قیمت باید اعداد مثبت باشند.",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "تلاش مجدد", callback_data: "ADMIN_PRODUCT_CREATE" }],
                    ],
                },
            }
        );
    }

    const product = await prisma.product.create({
        data: {
            name: name.trim(),
            trafficLimit: Math.round(gb * 1000),  // GB → MB
            durationDays: days,
            price: priceToman * 10,               // toman → rial
            isActive: true,
        },
    });

    await adapter.sendMessage(
        ctx.chatId,
        `✅ <b>پلن جدید ایجاد شد</b>\n\n` +
        `🏷 نام: ${product.name}\n` +
        `📶 حجم: ${gb} گیگابایت\n` +
        `📅 مدت: ${days} روز\n` +
        `💰 قیمت: ${priceToman.toLocaleString()} تومان`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📦 لیست پلن‌ها", callback_data: "ADMIN_PRODUCTS" }],
                    [{ text: "➕ افزودن پلن دیگر", callback_data: "ADMIN_PRODUCT_CREATE" }],
                ],
            },
        }
    );
};

// ── Edit price: step 1 — ask ──────────────────────────────────────────────────

export const adminProductEditPriceAskHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    const { id: productId } = parseCallbackData(ctx.callbackData ?? "");
    if (!productId) return adapter.sendMessage(ctx.chatId, "شناسه پلن نامعتبر است.");

    userSteps.set(String(ctx.chatId), `ADMIN_AWAITING_PRODUCT_PRICE:${productId}`);

    const product = await prisma.product.findUnique({ where: { id: productId } });

    await adapter.sendMessage(
        ctx.chatId,
        `✏️ قیمت فعلی پلن <b>${product?.name}</b>: ${((product?.price ?? 0) / 10).toLocaleString()} تومان\n\nقیمت جدید را به <b>تومان</b> وارد کنید:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 انصراف", callback_data: `ADMIN_PRODUCT_DETAIL:${productId}` }],
                ],
            },
        }
    );
};

// ── Edit price: step 2 — save ─────────────────────────────────────────────────

export const adminProductEditPriceConfirmHandler = async (
    ctx: BotContext,
    adapter: BotAdapter,
    productId: number
) => {
    if (!(await requireAdmin(ctx, adapter))) return;

    userSteps.delete(String(ctx.chatId));

    const priceToman = parseInt(ctx.text ?? "0");
    if (isNaN(priceToman) || priceToman <= 0) {
        return adapter.sendMessage(ctx.chatId, "❌ قیمت نامعتبر است.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "تلاش مجدد", callback_data: `ADMIN_PRODUCT_EDIT_PRICE:${productId}` }],
                ],
            },
        });
    }

    const product = await prisma.product.update({
        where: { id: productId },
        data: { price: priceToman * 10 },
    });

    await adapter.sendMessage(
        ctx.chatId,
        `✅ قیمت پلن <b>${product.name}</b> به <b>${priceToman.toLocaleString()} تومان</b> تغییر یافت.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به پلن", callback_data: `ADMIN_PRODUCT_DETAIL:${productId}` }],
                ],
            },
        }
    );
};
