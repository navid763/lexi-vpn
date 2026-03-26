import { User } from "../models/index.ts";

export class UserService {
    static async getOrCreateUser(
        chatId: number,
        messenger: "telegram" | "bale",
        fullName?: string | undefined,
        username?: string | undefined
    ) {
        let user = await User.findOne({
            where: {
                chat_id: String(chatId),
            },
        });

        if (!user) {
            user = await User.create({
                chat_id: String(chatId),
                messenger_type: messenger,
                full_name: fullName,
                username
            });
        } else {
            // let hasChange = false;

            if (user.toJSON().full_name !== fullName) {
                // user.full_name = fullName;
                // hasChange = false;
                await user.update({ full_name: fullName });
            }
            if (user.toJSON().username !== username) {
                // user.username = username;
                // hasChange = true;
                await user.update({ username: username });
            }
            // if (hasChange) {
            //     await user.save();
            // }
        }

        return user;
    }
}
