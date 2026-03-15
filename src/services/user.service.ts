import { User } from "../models/index.ts";

export class UserService {
    static async getOrCreateUser(chatId: number, messenger: "telegram" | "bale") {
        let user = await User.findOne({
            where: {
                chat_id: chatId,
            },
        });

        if (!user) {
            user = await User.create({
                chat_id: String(chatId),
                messenger_type: messenger,
            });
        }

        return user;
    }
}
