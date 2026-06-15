import { prisma } from "../config/prisma.js";
import * as crypto from "crypto";

function generateUniqueCode(): string {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

const REWARD = Number(process.env.REFFERAL_REWARD) || 0; // Rials

export class UserService {
    static async getOrCreateUser(
        chatId: number,
        messenger: "telegram" | "bale",
        fullName?: string,
        username?: string,
        referralPayload?: string
    ) {
        let user = await prisma.user.findUnique({
            where: { chatId: String(chatId) },
        });

        let rewardOptions = null;

        if (!user) {
            const newReferralCode = `REF-${generateUniqueCode()}`;

            const result = await prisma.$transaction(async (tx) => {
                let invitedById: number | undefined;
                let rewardInfo: { rewardOwnerChatId: string; reward: number } | null = null;

                if (referralPayload) {
                    const referrer = await tx.user.findUnique({
                        where: { referralCode: referralPayload },
                    });

                    if (referrer) {
                        invitedById = referrer.id;

                        await tx.user.update({
                            where: { id: referrer.id },
                            data: { balance: { increment: REWARD } },
                        });

                        rewardInfo = {
                            rewardOwnerChatId: referrer.chatId,
                            reward: REWARD,
                        };
                    }
                }

                const newUser = await tx.user.create({
                    data: {
                        chatId: String(chatId),
                        messengerType: messenger,
                        fullName,
                        username,
                        referralCode: newReferralCode,
                        balance: 0,
                        invitedById: invitedById ?? null,
                    },
                });

                return { newUser, rewardInfo };
            });

            user = result.newUser;
            rewardOptions = result.rewardInfo;
        } else {
            // Existing user: sync profile fields if they changed.
            const updates: Record<string, string | undefined> = {};
            if (user.fullName !== fullName) updates.fullName = fullName;
            if (user.username !== username) updates.username = username;

            if (Object.keys(updates).length > 0) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: updates,
                });
            }
        }

        return { user, rewardOptions };
    }
}
