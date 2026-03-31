import { UserService } from "../../services/user.service.ts";
import type { BotContext } from "../types/bot.context.ts";
import type { BotAdapter } from "../adapters/bot.adapter.ts";
import { mainMenuKeyboards } from "../utils/keyboards.ts";

export const startHandler = async (ctx: BotContext, adapter: BotAdapter) => {
    const messageText = ctx.text || "";
    const payloadText = messageText.split(" ")[1];

    const user = await UserService.getOrCreateUser(
        ctx.chatId,
        ctx.messenger,
        ctx.fullName,
        ctx.username,
        payloadText
    );

    await adapter.sendMessage(
        ctx.chatId,
        "welcome to Lexi 🚀",
        {
            reply_markup: mainMenuKeyboards()
        }
    );


    if (user.rewardOptions) {
        const { rewardOwnerChatId, reward } = user.rewardOptions;
        await adapter.sendMessage(
            Number(rewardOwnerChatId),
            `کاربر " ${ctx.fullName || ""} " با لینک شما ثبتنام کرد و ${reward / 10} تومان به اعتبار شما افزوده شد!
           `
        )
    }


}