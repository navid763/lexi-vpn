import type { BotContext } from "../types/bot.context.js";
export function parseBaleUpdate(update: any): BotContext | null {

    if (update.message) {

        const photos = update.message.photo;
        const photo = photos && photos.length > 0
            ? photos[photos.length - 1].file_id  // ← بزرگ‌ترین سایز
            : undefined;

        const from = update.message.from || update.message.chat;
        const username = from?.username || undefined;
        const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || undefined;
        return {
            chatId: update.message.chat.id,
            text: update.message.text,
            photo: photo,
            messenger: "bale",
            username,
            fullName,
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
            messenger: "bale",
            raw: update,
            username,
            fullName,
        };
    }

    return null;
}
