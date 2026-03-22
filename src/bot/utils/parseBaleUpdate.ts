import type { BotContext } from "../types/bot.context.ts";
export function parseBaleUpdate(update: any): BotContext | null {

    if (update.message) {

        const photos = update.message.photo;
        const photo = photos && photos.length > 0
            ? photos[photos.length - 1].file_id  // ← بزرگ‌ترین سایز
            : undefined;

        return {
            chatId: update.message.chat.id,
            text: update.message.text,
            photo: photo,
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
