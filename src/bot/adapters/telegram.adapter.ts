import axios, { type AxiosError } from "axios";
import type { BotAdapter, SendMessageOptions } from "./bot.adapter.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // retries at 500ms, 1000ms, 2000ms

function isNetworkError(err: unknown): boolean {
    const e = err as AxiosError;
    // No response = TCP-level failure (ECONNRESET, AggregateError, etc.) — safe to retry.
    // A real Telegram 4xx/5xx has a response and should NOT be retried.
    return e.isAxiosError === true && !e.response;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            if (!isNetworkError(err)) {
                throw err; // real Telegram error — fail immediately
            }

            if (attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `[TelegramAdapter] ${label} — network error attempt ${attempt}/${MAX_RETRIES}, retrying in ${delay}ms`
                );
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    console.error(`[TelegramAdapter] ${label} — failed after ${MAX_RETRIES} attempts`);
    throw lastError;
}

export class TelegramAdapter implements BotAdapter {
    private readonly baseUrl: string;

    constructor(token: string) {
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }

    async sendMessage(
        chatId: number,
        text: string,
        options?: SendMessageOptions
    ): Promise<void> {
        await withRetry(
            () =>
                axios.post(`${this.baseUrl}/sendMessage`, {
                    chat_id: chatId,
                    text,
                    parse_mode: "HTML",
                    reply_markup: options?.reply_markup,
                }),
            `sendMessage(chatId=${chatId})`
        );
    }

    async sendPhoto(
        chatId: number,
        photo: string,
        caption?: string,
        options?: SendMessageOptions
    ): Promise<void> {
        await withRetry(
            () =>
                axios.post(`${this.baseUrl}/sendPhoto`, {
                    chat_id: chatId,
                    photo,
                    caption,
                    parse_mode: "HTML",
                    ...options,
                }),
            `sendPhoto(chatId=${chatId})`
        );
    }
}
