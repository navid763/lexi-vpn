import { where } from "sequelize";
import { User } from "../models/index.ts";
import * as crypto from 'crypto';

function generateUniqueCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const REWARD = Number(process.env.REFFERAL_REWARD) || 0; // rial

export class UserService {
    static async getOrCreateUser(
        chatId: number,
        messenger: "telegram" | "bale",
        fullName?: string | undefined,
        username?: string | undefined,
        referralPayload?: string
    ) {
        let user = await User.findOne({
            where: {
                chat_id: String(chatId),
            },
        });


        let rewardOptions = null;

        if (!user) {
            let invitedById: number | undefined = undefined;
            if (referralPayload) {
                const referrer = await User.findOne({
                    where: { referral_code: referralPayload }
                });

                if (referrer) {
                    invitedById = referrer.toJSON().id;
                    await referrer.increment("balance", { by: REWARD });

                    rewardOptions = {
                        rewardOwnerChatId: referrer.toJSON().chat_id,
                        reward: REWARD
                    }
                }
            }
            const newReferralCode = `REF-${generateUniqueCode()}`;
            user = await User.create({
                chat_id: String(chatId),
                messenger_type: messenger,
                full_name: fullName,
                username,
                referral_code: newReferralCode,
                balance: 0,
                invited_by: invitedById || null

            });
        } else {

            if (user.toJSON().full_name !== fullName) {
                await user.update({ full_name: fullName });
            }
            if (user.toJSON().username !== username) {
                await user.update({ username: username });
            }
        }

        return { user, rewardOptions };
    }
}
