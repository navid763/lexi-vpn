import type { BotAdapter } from "../adapters/bot.adapter.ts";
import type { BotContext } from "../types/bot.context.ts";
import { Product } from "../../models/index.ts";
import { productsKeyboard } from "../utils/keyboards.ts";

export const plansHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    let products = await Product.findAll({
        where: { is_active: true }
    });

    products = products.map(p => p.toJSON());


    if (!products.length) {
        await adapter.sendMessage(
            ctx.chatId,
            "در حال حاضر پلنی موجود نیست."
        );
        return;
    }

    await adapter.sendMessage(
        ctx.chatId,
        "📦 یکی از سرویس ها را انتخاب کنید:",
        {
            reply_markup: productsKeyboard(products)
        }
    );
}