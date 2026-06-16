export interface SendMessageOptions {
    reply_markup?: any;
}

export interface BotAdapter {
    sendMessage(
        chatId: number,
        text: string,
        options?: SendMessageOptions
    ): Promise<void>;

    sendPhoto(
        chatId: number,
        photo: string,
        caption?: string,
        options?: SendMessageOptions
    ): Promise<void>;


    deleteMessage?(chatId: number, messageId: number): Promise<void>;
}
