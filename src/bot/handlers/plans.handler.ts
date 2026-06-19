import type { BotAdapter } from "../adapters/bot.adapter.js";
import type { BotContext } from "../types/bot.context.js";
import { prisma } from "../../config/prisma.js";
import { productsKeyboard } from "../utils/keyboards.js";
import { SettingsService } from "../../services/settings.service.js";

export const plansHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    if (await SettingsService.isMaintenanceMode()) {
        return adapter.sendMessage(ctx.chatId, "🛠 ربات موقتاً در حال بروزرسانی است. لطفاً کمی بعد دوباره تلاش کنید.");
    }

    const products = await prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
    });

    if (!products.length) {
        await adapter.sendMessage(ctx.chatId, "در حال حاضر پلنی موجود نیست.");
        return;
    }

    await adapter.sendMessage(ctx.chatId, "📦 یکی از سرویس ها را انتخاب کنید:", {
        reply_markup: productsKeyboard(products),
    });
};
