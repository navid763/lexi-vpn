import { UserService } from "../../services/user.service.js";
import type { BotContext } from "../types/bot.context.js";
import type { BotAdapter } from "../adapters/bot.adapter.js";
import { mainMenuKeyboards } from "../utils/keyboards.js";
import { userSteps } from "../utils/state.js";


export const startHandler = async (ctx: BotContext, adapter: BotAdapter) => {

    userSteps.delete(String(ctx.chatId)); // delete user's saved states

    const messageText = ctx.text || "";
    const payloadText = messageText.split(" ")[1];

    const { user, rewardOptions } = await UserService.getOrCreateUser(
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


    if (rewardOptions) {
        const { rewardOwnerChatId, reward } = rewardOptions;
        await adapter.sendMessage(
            Number(rewardOwnerChatId),
            `کاربر " ${ctx.fullName || ""} " با لینک شما ثبتنام کرد و ${reward / 10} تومان به اعتبار شما افزوده شد!
           `
        )
    }


}
