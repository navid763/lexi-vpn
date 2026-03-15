export interface SendMessageOptions {
    reply_markup?: any;
}

export interface BotAdapter {
    sendMessage(
        chatId: number,
        text: string,
        options?: SendMessageOptions
    ): Promise<void>;
}
