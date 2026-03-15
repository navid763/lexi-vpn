export interface BotContext {
    chatId: number;
    userId?: number;
    text?: string;
    callbackData?: string;
    messenger: "bale" | "telegram";
    messageId?: number;
    photo?: string;
    raw: any;
}
