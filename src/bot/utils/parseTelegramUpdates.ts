import type { BotContext } from "../types/bot.context.ts";

export function parseTelegramUpdate(update: any): BotContext | null {

    if (update.message) {
        const photos = update.message.photo;
        // Telegram sends an array of photo sizes; the last one is always the largest
        const photo = photos && photos.length > 0
            ? photos[photos.length - 1].file_id
            : undefined;

        const from = update.message.from;
        const username = from?.username || undefined;
        const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || undefined;

        return {
            chatId: update.message.chat.id,
            text: update.message.text,
            photo,
            messenger: "telegram",
            username,
            fullName,
            messageId: update.message.message_id,
            raw: update
        };
    }

    if (update.callback_query) {
        const from = update.callback_query.from;
        const username = from?.username || undefined;
        const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || undefined;

        return {
            chatId: update.callback_query.message.chat.id,
            callbackData: update.callback_query.data,
            messenger: "telegram",
            messageId: update.callback_query.message.message_id,
            username,
            fullName,
            raw: update
        };
    }

    return null;
}