export interface BotContext {
    chatId: number;
    userId?: number;
    text?: string;
    callbackData?: string;
    messenger: "bale" | "telegram";
    messageId?: number;
    username?: string;
    fullName?: string;
    photo?: string;
    raw: any;
}
