import axios from "axios";
import type { BotAdapter, SendMessageOptions } from "./bot.adapter.ts";

export class TelegramAdapter implements BotAdapter {
    private readonly baseUrl: string;

    constructor(token: string) {
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }


    async sendMessage(chatId: number, text: string, options?: SendMessageOptions): Promise<void> {
        await axios.post(`${this.baseUrl}/sendMessage`, {
            chat_id: chatId,
            text,
            // parse_mode lets you use **bold** and other markdown in messages
            parse_mode: "HTML",
            reply_markup: options?.reply_markup
        });
    }


    async sendPhoto(
        chatId: number,
        photo: string,
        caption?: string,
        options?: SendMessageOptions
    ): Promise<void> {
        await axios.post(`${this.baseUrl}/sendPhoto`, {
            chat_id: chatId,
            photo,
            caption,
            parse_mode: "HTML",
            ...options
        });
    }
}