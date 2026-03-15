import axios from "axios";
import type { BotAdapter, SendMessageOptions } from "./bot.adapter.ts";

export class BaleAdapter implements BotAdapter {
    private readonly baseUrl: string;

    constructor(token: string) {
        this.baseUrl = `https://tapi.bale.ai/bot${token}`;
    }

    async sendMessage(chatId: number, text: string, options?: SendMessageOptions): Promise<void> {
        await axios.post(`${this.baseUrl}/sendMessage`, {
            chat_id: chatId,
            text,
            reply_markup: options?.reply_markup
        });
    }
}