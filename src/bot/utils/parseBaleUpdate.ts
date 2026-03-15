import type { BotContext } from "../types/bot.context.ts";
export function parseBaleUpdate(update: any): BotContext | null {

    if (update.message) {
        return {
            chatId: update.message.chat.id,
            text: update.message.text,
            messenger: "bale",
            raw: update
        };
    }

    if (update.callback_query) {
        return {
            chatId: update.callback_query.message.chat.id,
            callbackData: update.callback_query.data,
            messenger: "bale",
            raw: update
        };
    }

    return null;
}
