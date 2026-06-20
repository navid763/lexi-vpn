import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { SubscriptionService } from "../../services/subscription.service.js";
import { prisma } from "../../config/prisma.js";
import { getRemainingTime } from "../../utils/date-time.js";

export const subscriptionsHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const user = await prisma.user.findUnique({
        where: { chatId: String(ctx.chatId) },
    });

    if (!user) {
        await adapter.sendMessage(ctx.chatId, "مشکلی پیش آمد. بعدا مجددا تلاش کنید");
        return;
    }

    // Fetch both ACTIVE and EXPIRED subscriptions so we can offer renewal on expired ones.
    // getSubscriptions now always includes order->product.
    const subscriptions = await SubscriptionService.getSubscriptions(user.id, true);

    if (!subscriptions.length) {
        await adapter.sendMessage(
            ctx.chatId,
            `در حال حاضر سرویسی ندارید.\nمشاهده سرویسها جهت خریداری:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📦 سرویس های موجود", callback_data: "PLANS" }],
                        [{ text: "بازگشت به خانه", callback_data: "HOME" }],
                    ],
                },
            }
        );
        return;
    }
    //
    // For each subscription we need the *current* state of its product
    // (price may have changed, product may have been deactivated since purchase).
    const productIds = [...new Set(subscriptions.map((s) => s.order.product.id))];
    const currentProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
    });
    const productMap = new Map(currentProducts.map((p) => [p.id, p]));

    // Build one message + inline keyboard per subscription
    const lines: string[] = [];
    const keyboard: { text: string; callback_data: string }[][] = [];

    for (const [i, sub] of subscriptions.entries()) {
        const isExpired = sub.status === "EXPIRED";
        const statusIcon = isExpired ? "🔴" : "🟢";
        const remaining = isExpired ? "منقضی شده" : getRemainingTime(sub.expireAt);

        lines.push(
            `${i + 1}- ${statusIcon} بسته ${sub.trafficLimit / 1000} گیگ` +
            `  ⏳ اعتبار: ${remaining}`
        );

        // Check whether the original product is still available for renewal.
        const currentProduct = productMap.get(sub.order.product.id);
        const canRenew = !!currentProduct && currentProduct.isActive && !currentProduct.deletedAt;

        if (canRenew) {
            const priceToman = (currentProduct.price / 10).toLocaleString();
            keyboard.push([
                {
                    text: `🔄 تمدید سرویس ${i + 1} — ${priceToman} تومان`,
                    callback_data: `RENEW:${sub.id}`,
                },
            ]);
        } else {
            // Product was removed/deactivated — user can't renew this plan,
            // but they can still buy a different one from the plans list.
            lines.push(`   ⚠️ این پلن دیگر موجود نیست (برای تمدید، سرویس جدید خریداری کنید)`);
        }
    }

    keyboard.push([{ text: "📦 خرید سرویس جدید", callback_data: "PLANS" }]);
    keyboard.push([{ text: "بازگشت به خانه 🏠", callback_data: "HOME" }]);

    await adapter.sendMessage(ctx.chatId, lines.join("\n \n"), {
        reply_markup: { inline_keyboard: keyboard },
    });
};
