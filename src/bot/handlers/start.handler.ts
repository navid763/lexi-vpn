import { UserService } from "../../services/user.service.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { mainMenuKeyboards } from "../utils/keyboards.ts";

export const startHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    const user = await UserService.getOrCreateUser(
        ctx.chatId,
        ctx.messenger,
        ctx.fullName,
        ctx.username
    );

    await adapter.sendMessage(
        ctx.chatId,
        "welcome to Lexi 🚀",
        {
            reply_markup: mainMenuKeyboards()
        }
    );


}